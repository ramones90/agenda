import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import db from './db.ts';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.use(express.json());

// Ensure test users exist
try {
  const admin = db.prepare('SELECT * FROM users WHERE id = ?').get('admin-1');
  if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, name, role, email, password, avatar) VALUES (?, ?, ?, ?, ?, ?)')
      .run('admin-1', 'Administrador', 'admin', 'admin@psiconnect.com', hashedPassword, 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff');
    console.log('Admin user created: admin@psiconnect.com / admin123');
  }

  const testPsico = db.prepare('SELECT * FROM users WHERE id = ?').get('psico-1');
  if (!testPsico) {
    const hashedPassword = bcrypt.hashSync('psico123', 10);
    db.prepare('INSERT INTO users (id, name, role, email, password, avatar) VALUES (?, ?, ?, ?, ?, ?)')
      .run('psico-1', 'Dr. Roberto Santos', 'psychologist', 'roberto@psiconnect.com', hashedPassword, 'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200&h=200');
    console.log('Test psychologist created: roberto@psiconnect.com / psico123');
  } else if (!testPsico.password) {
    // Update password if it was missing (from previous versions)
    const hashedPassword = bcrypt.hashSync('psico123', 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, 'psico-1');
    console.log('Test psychologist password updated: psico123');
  }
} catch (e) {
  console.error('Error creating test users:', e);
}

// Google OAuth Setup
const getRedirectUri = (req: express.Request) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/auth/callback/google`;
};

// Auth Routes for Google Calendar
app.get('/api/auth/google/url', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const redirectUri = getRedirectUri(req);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: userId as string,
    prompt: 'consent' // Force refresh token
  });

  res.json({ url: authUrl });
});

app.get('/auth/callback/google', async (req, res) => {
  const { code, state } = req.query;
  const userId = state as string;

  if (!code || !userId) {
    return res.status(400).send('Invalid request');
  }

  try {
    const redirectUri = getRedirectUri(req);
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await client.getToken(code as string);
    
    if (tokens.refresh_token) {
      // @ts-ignore
      db.prepare('UPDATE users SET google_refresh_token = ? WHERE id = ?').run(tokens.refresh_token, userId);
    }

    // Send success message to opener
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              document.body.innerHTML = 'Authentication successful. You can close this window.';
            }
          </script>
          <p>Conectado com sucesso ao Google Calendar! Fechando janela...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Check if user is connected to Google
app.get('/api/users/:userId/google-status', (req, res) => {
  const { userId } = req.params;
  // @ts-ignore
  const user = db.prepare('SELECT google_refresh_token FROM users WHERE id = ?').get(userId);
  res.json({ isConnected: !!user?.google_refresh_token });
});

// Socket.IO Signaling for Video Calls
const roomParticipants = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId, role) => {
    socket.join(roomId);
    
    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Set());
    }
    
    // Check if someone is already in the room before adding the new user
    const existingParticipants = Array.from(roomParticipants.get(roomId) || []);
    const isOtherPresent = existingParticipants.length > 0;
    
    roomParticipants.get(roomId)?.add(userId);

    // Tell the user who just joined if someone is already there
    socket.emit('room-status', { isOtherPresent });

    // Notify others in the room
    socket.to(roomId).emit('user-connected', { userId, role, socketId: socket.id });

    // Handle chat messages
    socket.on('send-chat-message', (message) => {
      io.to(roomId).emit('receive-chat-message', {
        ...message,
        timestamp: new Date().toISOString()
      });
    });

    // Handle media status changes
    socket.on('media-status-change', (status) => {
      socket.to(roomId).emit('peer-media-status', { userId, ...status });
    });

    socket.on('disconnect', () => {
      roomParticipants.get(roomId)?.delete(userId);
      if (roomParticipants.get(roomId)?.size === 0) {
        roomParticipants.delete(roomId);
      }
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });

  // WebRTC Signaling (Relay)
  socket.on('signal', (payload) => {
    console.log('Relaying signal from:', socket.id, 'to:', payload.target);
    io.to(payload.target).emit('signal', {
      signal: payload.signal,
      sender: payload.sender,
      socketId: socket.id
    });
  });
});

// API Routes
app.get('/api/rooms/:roomId/validate', (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ error: 'User ID required' });

  // @ts-ignore
  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(roomId);

  if (!appointment) {
    return res.status(404).json({ error: 'Sessão não encontrada.' });
  }

  if (appointment.psychologist_id !== userId && appointment.patient_id !== userId) {
    return res.status(403).json({ error: 'Você não tem permissão para acessar esta sala.' });
  }

  res.json({ 
    authorized: true, 
    role: appointment.psychologist_id === userId ? 'psychologist' : 'patient',
    appointment 
  });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth
app.post('/api/login', (req, res) => {
  const { role, email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  // @ts-ignore
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado. Verifique seu email ou faça o cadastro.' });
  }

  if (user.password) {
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }
  }

  if (user.role !== role) {
    return res.status(401).json({ error: `Este email não pertence a um perfil de ${role === 'patient' ? 'paciente' : role === 'psychologist' ? 'psicólogo' : 'administrador'}.` });
  }
  
  res.json(user);
});

app.post('/api/register', (req, res) => {
  const { name, email, password, role, phone, birthDate } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  // Check if user exists
  // @ts-ignore
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Este email já está em uso.' });
  }

  const id = uuidv4();
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    // @ts-ignore
    db.prepare('INSERT INTO users (id, name, role, email, password, avatar, phone, birthDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, role, email, hashedPassword, avatar, phone, birthDate);
    res.json({ id, name, role, email, avatar, phone, birthDate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

// Admin: Create Psychologist
app.post('/api/admin/psychologists', (req, res) => {
  const { name, email } = req.body;
  const id = uuidv4();
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
  
  try {
    // @ts-ignore
    db.prepare('INSERT INTO users (id, name, role, email, avatar) VALUES (?, ?, ?, ?, ?)').run(id, name, 'psychologist', email, avatar);
    res.json({ id, name, email, role: 'psychologist' });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Admin: List Psychologists
app.get('/api/admin/psychologists', (req, res) => {
  // @ts-ignore
  const psychologists = db.prepare("SELECT * FROM users WHERE role = 'psychologist'").all();
  res.json(psychologists);
});

// Patients
app.get('/api/patients', (req, res) => {
  const { psychologistId } = req.query;
  // In a real app, we would filter by patients who have appointments with this psychologist
  // For now, let's return all patients to make it easier to test
  const patients = db.prepare("SELECT id, name, email, avatar FROM users WHERE role = 'patient'").all();
  res.json(patients);
});

// Appointments
app.post('/api/appointments/:id/complete', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'completed' or 'no-show'

  try {
    // @ts-ignore
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

app.get('/api/appointments', (req, res) => {
  const { userId, role } = req.query;
  
  if (!userId || !role) {
    return res.status(400).json({ error: 'Missing userId or role' });
  }

  let stmt;
  if (role === 'psychologist') {
    // @ts-ignore
    stmt = db.prepare(`
      SELECT a.*, u.name as patient_name, u.avatar as patient_avatar 
      FROM appointments a 
      JOIN users u ON a.patient_id = u.id 
      WHERE a.psychologist_id = ? 
      ORDER BY a.date ASC
    `);
  } else if (role === 'patient') {
    // @ts-ignore
    stmt = db.prepare(`
      SELECT a.*, u.name as psychologist_name, u.avatar as psychologist_avatar 
      FROM appointments a 
      JOIN users u ON a.psychologist_id = u.id 
      WHERE a.patient_id = ? 
      ORDER BY a.date ASC
    `);
  } else {
    return res.json([]); // Admin or other roles don't have personal appointments in this view
  }

  const appointments = stmt.all(userId);
  res.json(appointments);
});

// Mood Logs
app.get('/api/mood/:patientId', (req, res) => {
  // @ts-ignore
  const logs = db.prepare('SELECT * FROM mood_logs WHERE patient_id = ? ORDER BY date DESC LIMIT 7').all(req.params.patientId);
  res.json(logs);
});

app.post('/api/mood', (req, res) => {
  const { patientId, score, note } = req.body;
  const id = uuidv4();
  const date = new Date().toISOString();
  // @ts-ignore
  db.prepare('INSERT INTO mood_logs (id, patient_id, date, score, note) VALUES (?, ?, ?, ?, ?)').run(id, patientId, date, score, note);
  res.json({ id, date });
});

// Materials
app.get('/api/materials', (req, res) => {
  const { psychologistId } = req.query;
  let stmt;
  if (psychologistId) {
    // @ts-ignore
    stmt = db.prepare('SELECT * FROM materials WHERE psychologist_id = ? ORDER BY created_at DESC');
    res.json(stmt.all(psychologistId));
  } else {
    // @ts-ignore
    stmt = db.prepare('SELECT * FROM materials ORDER BY created_at DESC');
    res.json(stmt.all());
  }
});

app.post('/api/materials', (req, res) => {
  const { psychologistId, title, type, contentUrl, description } = req.body;
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  // @ts-ignore
  db.prepare('INSERT INTO materials (id, psychologist_id, title, type, content_url, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, psychologistId, title, type, contentUrl, description, createdAt);
  res.json({ id, createdAt });
});

// Tasks
app.get('/api/tasks', (req, res) => {
  const { patientId, psychologistId } = req.query;
  let stmt;
  if (patientId) {
    // @ts-ignore
    stmt = db.prepare('SELECT * FROM tasks WHERE patient_id = ? ORDER BY created_at DESC');
    res.json(stmt.all(patientId));
  } else if (psychologistId) {
    // @ts-ignore
    stmt = db.prepare('SELECT * FROM tasks WHERE psychologist_id = ? ORDER BY created_at DESC');
    res.json(stmt.all(psychologistId));
  } else {
    res.status(400).json({ error: 'Missing patientId or psychologistId' });
  }
});

app.post('/api/tasks', (req, res) => {
  const { psychologistId, patientId, title, description, dueDate } = req.body;
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  // @ts-ignore
  db.prepare('INSERT INTO tasks (id, psychologist_id, patient_id, title, description, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, psychologistId, patientId, title, description, dueDate, createdAt);
  res.json({ id, createdAt });
});

app.post('/api/tasks/:id/complete', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'completed' or 'pending'
  // @ts-ignore
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true });
});

// Appointment Notes (Patient Private)
app.get('/api/appointments/:id/notes', (req, res) => {
  const { id } = req.params;
  // @ts-ignore
  const notes = db.prepare('SELECT * FROM appointment_notes WHERE appointment_id = ?').get(id);
  res.json(notes || { patient_notes: '' });
});

app.post('/api/appointments/:id/notes', (req, res) => {
  const { id } = req.params;
  const { patientNotes } = req.body;
  const noteId = uuidv4();
  
  try {
    // @ts-ignore
    db.prepare('INSERT INTO appointment_notes (id, appointment_id, patient_notes) VALUES (?, ?, ?) ON CONFLICT(appointment_id) DO UPDATE SET patient_notes = excluded.patient_notes').run(noteId, id, patientNotes);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// Questionnaire Endpoints
app.get('/api/questionnaires/templates', (req, res) => {
  const templates = db.prepare('SELECT * FROM questionnaire_templates').all();
  res.json(templates);
});

app.get('/api/questionnaires/templates/:id', (req, res) => {
  const template = db.prepare('SELECT * FROM questionnaire_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  
  const questions = db.prepare('SELECT * FROM questions WHERE template_id = ? ORDER BY sort_order').all();
  res.json({ ...template, questions: questions.map((q: any) => ({ ...q, options: JSON.parse(q.options_json || '[]') })) });
});

app.post('/api/questionnaires/assign', (req, res) => {
  const { patientId, psychologistId, templateId, dueDate } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO questionnaire_assignments (id, patient_id, psychologist_id, template_id, assigned_at, due_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, patientId, psychologistId, templateId, new Date().toISOString(), dueDate);
  res.json({ id });
});

app.get('/api/questionnaires/assignments', (req, res) => {
  const { patientId, psychologistId } = req.query;
  let query = `
    SELECT a.*, t.name as template_name, t.is_standardized, u.name as psychologist_name
    FROM questionnaire_assignments a
    JOIN questionnaire_templates t ON a.template_id = t.id
    JOIN users u ON a.psychologist_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  
  if (patientId) {
    query += ' AND a.patient_id = ?';
    params.push(patientId);
  }
  if (psychologistId) {
    query += ' AND a.psychologist_id = ?';
    params.push(psychologistId);
  }
  
  query += ' ORDER BY a.assigned_at DESC';
  const assignments = db.prepare(query).all(...params);
  res.json(assignments);
});

app.get('/api/questionnaires/assignments/:id', (req, res) => {
  const assignment = db.prepare(`
    SELECT a.*, t.name as template_name, t.instructions, t.description
    FROM questionnaire_assignments a
    JOIN questionnaire_templates t ON a.template_id = t.id
    WHERE a.id = ?
  `).get(req.params.id);
  
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  
  const questions = db.prepare('SELECT * FROM questions WHERE template_id = ? ORDER BY sort_order').all();
  res.json({ 
    ...assignment, 
    questions: questions.map((q: any) => ({ ...q, options: JSON.parse(q.options_json || '[]') })) 
  });
});

app.post('/api/questionnaires/responses', (req, res) => {
  const { assignment_id, answers } = req.body;
  const id = uuidv4();
  const respondedAt = new Date().toISOString();
  
  // Calculate scores if it's a standardized questionnaire
  const assignment = db.prepare(`
    SELECT a.template_id, t.is_standardized 
    FROM questionnaire_assignments a
    JOIN questionnaire_templates t ON a.template_id = t.id
    WHERE a.id = ?
  `).get(assignment_id);

  let totalScore = 0;
  if (assignment.is_standardized) {
    const questions = db.prepare('SELECT id, options_json FROM questions WHERE template_id = ?').all(assignment.template_id);
    questions.forEach((q: any) => {
      const options = JSON.parse(q.options_json || '[]');
      const answerValue = answers[q.id];
      const selectedOption = options.find((opt: any) => opt.value === answerValue);
      if (selectedOption) {
        totalScore += selectedOption.score || 0;
      }
    });
  }

  const scoresJson = JSON.stringify({ total: totalScore });
  const answersJson = JSON.stringify(answers);

  db.transaction(() => {
    db.prepare('INSERT INTO questionnaire_responses (id, assignment_id, responded_at, answers_json, scores_json) VALUES (?, ?, ?, ?, ?)')
      .run(id, assignment_id, respondedAt, answersJson, scoresJson);
    
    db.prepare('UPDATE questionnaire_assignments SET status = "completed" WHERE id = ?')
      .run(assignment_id);
  })();

  res.json({ id, totalScore });
});

app.get('/api/questionnaires/results/:patientId', (req, res) => {
  const results = db.prepare(`
    SELECT r.*, a.assigned_at, t.name as template_name, t.is_standardized
    FROM questionnaire_responses r
    JOIN questionnaire_assignments a ON r.assignment_id = a.id
    JOIN questionnaire_templates t ON a.template_id = t.id
    WHERE a.patient_id = ?
    ORDER BY r.responded_at DESC
  `).all(req.params.patientId);
  
  res.json(results.map((r: any) => ({
    ...r,
    answers: JSON.parse(r.answers_json),
    scores: JSON.parse(r.scores_json)
  })));
});

// AI Analysis
app.post('/api/ai/analyze-session', async (req, res) => {
  const { notes } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
      Atue como um assistente clínico sênior. Analise as seguintes anotações de uma sessão de terapia e forneça um JSON com as seguintes chaves:
      - "summary": Um resumo conciso (máx 3 frases).
      - "themes": Array de strings com os principais temas abordados.
      - "intervention": Sugestão de intervenção para a próxima sessão.
      - "sentiment": Análise de sentimento (Positivo, Neutro, Negativo ou Misto).

      Anotações: "${notes}"
      
      Responda APENAS com o JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    const responseText = response.text;
    if (!responseText) throw new Error('No response from AI');
    
    res.json(JSON.parse(responseText));
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: 'Failed to analyze session' });
  }
});

// Messages
app.get('/api/messages', (req, res) => {
  const { userId, contactId } = req.query;
  // @ts-ignore
  const messages = db.prepare(`
    SELECT * FROM messages 
    WHERE (sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?)
    ORDER BY timestamp ASC
  `).all(userId, contactId, contactId, userId);
  res.json(messages);
});

app.post('/api/messages', (req, res) => {
  const { senderId, receiverId, content } = req.body;
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  
  // @ts-ignore
  db.prepare('INSERT INTO messages (id, sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, ?, ?)').run(id, senderId, receiverId, content, timestamp);
  
  const message = { id, sender_id: senderId, receiver_id: receiverId, content, timestamp };
  io.to(receiverId).emit('receive-message', message);
  res.json(message);
});

// Contacts (Psychologist <-> Patient)
app.get('/api/contacts', (req, res) => {
  const { userId, role } = req.query;
  let contacts;
  
  if (role === 'psychologist') {
    // Get all patients
    // @ts-ignore
    contacts = db.prepare("SELECT id, name, avatar, email FROM users WHERE role = 'patient'").all();
  } else {
    // Get all psychologists
    // @ts-ignore
    contacts = db.prepare("SELECT id, name, avatar, email FROM users WHERE role = 'psychologist'").all();
  }
  res.json(contacts);
});

// Availability Endpoint
app.get('/api/psychologists/:id/availability', (req, res) => {
  const { id } = req.params;
  const { date } = req.query; // YYYY-MM-DD

  if (!date) return res.status(400).json({ error: 'Date is required' });

  // Use UTC to avoid timezone shifts when parsing YYYY-MM-DD
  const dateObj = new Date(`${date}T12:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay();
  
  // @ts-ignore
  const rules = db.prepare('SELECT * FROM psychologist_availability WHERE psychologist_id = ? AND day_of_week = ?').all(id, dayOfWeek);
  
  if (rules.length === 0) return res.json({ slots: [], message: 'O profissional não atende neste dia.' });

  // @ts-ignore
  const appointments = db.prepare('SELECT date FROM appointments WHERE psychologist_id = ? AND date LIKE ? AND status != "cancelled"').all(id, `${date}%`);
  
  // Extract HH:mm from stored ISO-like strings (e.g., 2026-03-27T09:00:00)
  const bookedTimes = appointments.map((a: any) => {
    const t = a.date.split('T')[1];
    return t ? t.substring(0, 5) : '';
  });

  const slots: string[] = [];
  rules.forEach((rule: any) => {
    let [startHour, startMin] = rule.start_time.split(':').map(Number);
    let [endHour, endMin] = rule.end_time.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      
      // Check if slot is booked
      if (!bookedTimes.includes(timeStr)) {
        // Also check if it's in the past if the date is today
        const now = new Date();
        const slotDate = new Date(`${date}T${timeStr}:00`);
        if (slotDate > now) {
          slots.push(timeStr);
        }
      }
      
      // Advance 1 hour (standard session duration)
      currentHour++;
    }
  });

  res.json({ slots, rules });
});

app.get('/api/psychologists/:id/work-days', (req, res) => {
  const { id } = req.params;
  // @ts-ignore
  const rules = db.prepare('SELECT DISTINCT day_of_week FROM psychologist_availability WHERE psychologist_id = ?').all(id);
  res.json(rules.map((r: any) => r.day_of_week));
});

app.get('/api/psychologists/:id/availability-rules', (req, res) => {
  const { id } = req.params;
  // @ts-ignore
  const rules = db.prepare('SELECT * FROM psychologist_availability WHERE psychologist_id = ? ORDER BY day_of_week, start_time').all(id);
  res.json(rules);
});

app.post('/api/psychologists/:id/availability', (req, res) => {
  const { id } = req.params;
  const { availability } = req.body; // Array of { day_of_week, start_time, end_time }

  try {
    db.transaction(() => {
      // @ts-ignore
      db.prepare('DELETE FROM psychologist_availability WHERE psychologist_id = ?').run(id);
      
      const insert = db.prepare('INSERT INTO psychologist_availability (id, psychologist_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
      availability.forEach((rule: any) => {
        insert.run(uuidv4(), id, rule.day_of_week, rule.start_time, rule.end_time);
      });
    })();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save availability' });
  }
});

// Calendar / Appointments Management
app.post('/api/appointments', async (req, res) => {
  const { psychologistId, patientId, date } = req.body;
  const id = uuidv4();
  
  try {
    // @ts-ignore
    db.prepare('INSERT INTO appointments (id, psychologist_id, patient_id, date, status) VALUES (?, ?, ?, ?, ?)').run(id, psychologistId, patientId, date, 'scheduled');
    
    // Sync with Google Calendar
    // @ts-ignore
    const psychologist = db.prepare('SELECT google_refresh_token FROM users WHERE id = ?').get(psychologistId);

    if (psychologist?.google_refresh_token) {
      try {
        const redirectUri = getRedirectUri(req);
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          redirectUri
        );
        oauth2Client.setCredentials({ refresh_token: psychologist.google_refresh_token });
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        // Get patient info
        // @ts-ignore
        const patient = db.prepare('SELECT name, email FROM users WHERE id = ?').get(patientId);
        
        const startTime = new Date(date);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const appUrl = `${protocol}://${host}`;

        const event = {
          summary: `Sessão com ${patient.name}`,
          description: `Sessão de terapia com ${patient.name}. Link da sala: ${appUrl}/room/${id}`,
          start: { dateTime: startTime.toISOString() },
          end: { dateTime: endTime.toISOString() },
          attendees: [{ email: patient.email }],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 10 },
            ],
          },
        };

        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });
        
        // Update appointment with google event id
        // @ts-ignore
        db.prepare('UPDATE appointments SET google_calendar_event_id = ? WHERE id = ?').run(response.data.id, id);
        
      } catch (error) {
        console.error('Google Calendar Sync Error:', error);
        // Don't fail the request if sync fails
      }
    }

    res.json({ id, psychologistId, patientId, date, status: 'scheduled' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Journal
app.get('/api/journal/:userId', (req, res) => {
  // Reuse mood_logs as journal entries for now, or create separate table
  // Using mood_logs for simplicity as it has 'note'
  // @ts-ignore
  const logs = db.prepare('SELECT * FROM mood_logs WHERE patient_id = ? ORDER BY date DESC').all(req.params.userId);
  res.json(logs);
});

async function startServer() {
  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '::', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
