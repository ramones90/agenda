import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import db from './db.ts';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
// @ts-ignore
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import winston from 'winston';

const app = express();
const httpServer = createServer(app);
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'psiconnect-refresh-secret-2026';

if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "*", // Restrict in production
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.use(cookieParser());
app.use(helmet({
  contentSecurityPolicy: false, 
}));
app.use(express.json());

// Security Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

const logSecurityEvent = (event: string, details: any, severity: 'info' | 'warning' | 'critical' = 'info') => {
  const timestamp = new Date().toISOString();
  const userId = details.userId || null;
  const ip = details.ip || 'unknown';
  const detailsStr = JSON.stringify(details);

  try {
    // @ts-ignore
    db.prepare('INSERT INTO audit_logs (id, user_id, event, details, ip, severity, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), userId, event, detailsStr, ip, severity, timestamp);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }

  logger.log(severity === 'critical' ? 'error' : severity === 'warning' ? 'warn' : 'info', {
    event,
    ...details,
    timestamp
  });
};

// Software WAF Middleware
const wafMiddleware = (req: any, res: any, next: any) => {
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i,
    /union select/i,
    /drop table/i,
    /--/i,
    /\.\.\//i, // Path traversal
  ];

  const checkValue = (val: any): boolean => {
    if (typeof val === 'string') {
      return maliciousPatterns.some(pattern => pattern.test(val));
    }
    if (typeof val === 'object' && val !== null) {
      return Object.values(val).some(v => checkValue(v));
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    logSecurityEvent('WAF_BLOCK', { 
      ip: req.ip, 
      path: req.path, 
      method: req.method,
      body: req.body,
      query: req.query
    }, 'warning');
    return res.status(403).json({ error: 'Requisição bloqueada por motivos de segurança.' });
  }

  next();
};

app.use(wafMiddleware);

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Muitas requisições deste IP, tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/register attempts per hour
  message: { error: 'Muitas tentativas de acesso, tente novamente em uma hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.accessToken;

  if (!token) {
    logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'Sessão expirada ou não autenticada.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      logSecurityEvent('INVALID_TOKEN_ATTEMPT', { path: req.path, ip: req.ip, error: err.message });
      return res.status(403).json({ error: 'Sessão inválida. Por favor, faça login novamente.' });
    }
    req.user = user;
    next();
  });
};

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
app.get('/api/auth/google/url', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  
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
app.get('/api/users/:userId/google-status', authenticateToken, (req: any, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  // @ts-ignore
  const user = db.prepare('SELECT google_refresh_token FROM users WHERE id = ?').get(userId);
  res.json({ isConnected: !!user?.google_refresh_token });
});

app.get('/api/users/:userId/mercadopago-status', authenticateToken, (req: any, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  // @ts-ignore
  const user = db.prepare('SELECT mercadopago_access_token FROM users WHERE id = ?').get(userId);
  res.json({ isConnected: !!user?.mercadopago_access_token, token: user?.mercadopago_access_token });
});

// Socket.IO Signaling for Video Calls
const roomParticipants = new Map<string, Set<string>>();

io.use((socket, next) => {
  const cookies = (socket.handshake.headers.cookie || '').split(';').reduce((acc: any, curr) => {
    const [key, value] = curr.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const token = cookies.accessToken;
  if (!token) return next(new Error('Authentication error'));
  
  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return next(new Error('Authentication error'));
    (socket as any).user = decoded;
    next();
  });
});

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
app.get('/api/rooms/:roomId/validate', authenticateToken, (req: any, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

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
const loginSchema = z.object({
  role: z.enum(['patient', 'psychologist', 'admin']),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

app.post('/api/login', authLimiter, (req, res) => {
  try {
    const { role, email, password } = loginSchema.parse(req.body);
    
    // @ts-ignore
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      logSecurityEvent('LOGIN_FAILURE', { email, reason: 'User not found', ip: req.ip });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (user.password) {
      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        logSecurityEvent('LOGIN_FAILURE', { email, userId: user.id, reason: 'Wrong password', ip: req.ip });
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }
    }

    if (user.role !== role) {
      logSecurityEvent('LOGIN_FAILURE', { email, userId: user.id, reason: 'Role mismatch', ip: req.ip });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Check for MFA
    if (user.mfa_enabled && (user.role === 'psychologist' || user.role === 'admin')) {
      logSecurityEvent('MFA_REQUIRED', { userId: user.id, email: user.email, role: user.role, ip: req.ip });
      return res.json({ 
        mfaRequired: true, 
        userId: user.id,
        message: 'Autenticação de dois fatores necessária.' 
      });
    }
    
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store refresh token
    db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(refreshToken, user.id, expiresAt.toISOString());

    // Set cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15m
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/refresh', // Only send to refresh endpoint
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    });

    logSecurityEvent('LOGIN_SUCCESS', { userId: user.id, email: user.email, role: user.role, ip: req.ip });

    const { password: _, mercadopago_access_token: __, google_refresh_token: ___, ...userSafe } = user;
    res.json({ user: userSafe });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

app.post('/api/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token missing' });

  const storedToken = db.prepare('SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0').get(refreshToken) as any;
  if (!storedToken || new Date(storedToken.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(storedToken.user_id) as any;
  if (!user) return res.status(401).json({ error: 'User not found' });

  const newAccessToken = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?').run(refreshToken);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/refresh' });
  res.json({ success: true });
});

// MFA Endpoints
app.post('/api/mfa/setup', authenticateToken, async (req: any, res) => {
  const userId = req.user.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'patient') return res.status(403).json({ error: 'MFA não disponível para pacientes.' });

  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'Psiconnect', secret);
  
  try {
    const qrCodeUrl = await QRCode.toDataURL(otpauth);
    // Store secret temporarily (or permanently but disabled)
    db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(secret, userId);
    
    res.json({ qrCodeUrl, secret });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

app.post('/api/mfa/verify', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const { code } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

  if (!user || !user.mfa_secret) return res.status(400).json({ error: 'MFA not setup' });

  const isValid = authenticator.check(code, user.mfa_secret);
  if (isValid) {
    db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(userId);
    logSecurityEvent('MFA_ENABLED', { userId, ip: req.ip });
    res.json({ success: true });
  } else {
    logSecurityEvent('MFA_VERIFY_FAILURE', { userId, ip: req.ip }, 'warning');
    res.status(400).json({ error: 'Código inválido.' });
  }
});

app.post('/api/mfa/validate-login', authLimiter, (req, res) => {
  const { userId, code } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

  if (!user || !user.mfa_secret || !user.mfa_enabled) {
    return res.status(400).json({ error: 'MFA not enabled' });
  }

  const isValid = authenticator.check(code, user.mfa_secret);
  if (!isValid) {
    logSecurityEvent('MFA_LOGIN_FAILURE', { userId, ip: req.ip }, 'warning');
    return res.status(401).json({ error: 'Código inválido.' });
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(refreshToken, user.id, expiresAt.toISOString());

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logSecurityEvent('LOGIN_SUCCESS_MFA', { userId: user.id, email: user.email, role: user.role, ip: req.ip });

  const { password: _, mercadopago_access_token: __, google_refresh_token: ___, ...userSafe } = user;
  res.json({ user: userSafe });
});

// Audit Logs
app.get('/api/admin/audit-logs', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
  
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all();
  res.json(logs);
});

const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  role: z.literal('patient'),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
});

app.post('/api/register', authLimiter, (req, res) => {
  try {
    const { name, email, password, role, phone, birthDate } = registerSchema.parse(req.body);

    // Check if user exists
    // @ts-ignore
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Este email já está em uso.' });
    }

    const id = uuidv4();
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    const hashedPassword = bcrypt.hashSync(password, 12); // Increased salt rounds

    // @ts-ignore
    db.prepare('INSERT INTO users (id, name, role, email, password, avatar, phone, birthDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, role, email, hashedPassword, avatar, phone, birthDate);
    
    logSecurityEvent('USER_REGISTERED', { userId: id, email, role, ip: req.ip });

    res.json({ success: true, message: 'Conta criada com sucesso. Por favor, faça login.' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues[0].message });
    }
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

// Admin: Create Psychologist
app.post('/api/admin/psychologists', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') {
    logSecurityEvent('UNAUTHORIZED_ADMIN_ACTION', { userId: req.user.id, action: 'create_psychologist', ip: req.ip });
    return res.status(403).json({ error: 'Acesso negado.' });
  }
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
app.get('/api/admin/psychologists', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
  // @ts-ignore
  const psychologists = db.prepare("SELECT * FROM users WHERE role = 'psychologist'").all();
  res.json(psychologists);
});

// Patients
app.get('/api/patients', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'Acesso negado.' });
  const psychologistId = req.user.id;
  // In a real app, we would filter by patients who have appointments with this psychologist
  // For now, let's return all patients to make it easier to test
  const patients = db.prepare("SELECT id, name, email, avatar FROM users WHERE role = 'patient'").all();
  res.json(patients);
});

// Appointments
app.post('/api/appointments/:id/complete', authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'completed' or 'no-show'

  if (req.user.role !== 'psychologist') {
    logSecurityEvent('UNAUTHORIZED_ACTION', { userId: req.user.id, action: 'complete_appointment', appointmentId: id, ip: req.ip });
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    // Verify ownership
    // @ts-ignore
    const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!apt || apt.psychologist_id !== req.user.id) {
      return res.status(403).json({ error: 'Você não tem permissão para atualizar este agendamento.' });
    }

    // @ts-ignore
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

app.get('/api/appointments', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  
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
app.get('/api/mood/:patientId', authenticateToken, (req: any, res) => {
  const { patientId } = req.params;
  
  // Only the patient themselves or their psychologist should see this
  // In a real app, we'd check the relationship. For now, let's allow the patient or any psychologist
  if (req.user.role === 'patient' && req.user.id !== patientId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  // @ts-ignore
  const logs = db.prepare('SELECT * FROM mood_logs WHERE patient_id = ? ORDER BY date DESC LIMIT 7').all(patientId);
  res.json(logs);
});

app.post('/api/mood', authenticateToken, (req: any, res) => {
  const patientId = req.user.id;
  if (req.user.role !== 'patient') return res.status(403).json({ error: 'Apenas pacientes podem registrar humor.' });
  
  const { score, note } = req.body;
  const id = uuidv4();
  const date = new Date().toISOString();
  // @ts-ignore
  db.prepare('INSERT INTO mood_logs (id, patient_id, date, score, note) VALUES (?, ?, ?, ?, ?)').run(id, patientId, date, score, note);
  res.json({ id, date });
});

// Materials
app.get('/api/materials', authenticateToken, (req: any, res) => {
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

app.post('/api/materials', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'Acesso negado.' });
  const psychologistId = req.user.id;
  const { title, type, contentUrl, description } = req.body;
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  // @ts-ignore
  db.prepare('INSERT INTO materials (id, psychologist_id, title, type, content_url, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, psychologistId, title, type, contentUrl, description, createdAt);
  res.json({ id, createdAt });
});

// Tasks
app.get('/api/tasks', authenticateToken, (req: any, res) => {
  const { patientId, psychologistId } = req.query;
  const userId = req.user.id;
  const role = req.user.role;

  if (role === 'patient' && patientId !== userId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  if (role === 'psychologist' && psychologistId !== userId && !patientId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

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

app.post('/api/tasks', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'Acesso negado.' });
  const psychologistId = req.user.id;
  const { patientId, title, description, dueDate } = req.body;
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  // @ts-ignore
  db.prepare('INSERT INTO tasks (id, psychologist_id, patient_id, title, description, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, psychologistId, patientId, title, description, dueDate, createdAt);
  res.json({ id, createdAt });
});

app.post('/api/tasks/:id/complete', authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'completed' or 'pending'
  
  // Verify ownership
  // @ts-ignore
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task || (task.patient_id !== req.user.id && task.psychologist_id !== req.user.id)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  // @ts-ignore
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true });
});

// Appointment Notes (Patient Private)
app.get('/api/appointments/:id/notes', authenticateToken, (req: any, res) => {
  const { id } = req.params;
  
  // Verify ownership
  // @ts-ignore
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!apt || (apt.patient_id !== req.user.id && apt.psychologist_id !== req.user.id)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  // @ts-ignore
  const notes = db.prepare('SELECT * FROM appointment_notes WHERE appointment_id = ?').get(id);
  res.json(notes || { patient_notes: '' });
});

app.post('/api/appointments/:id/notes', authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const { patientNotes } = req.body;
  const noteId = uuidv4();
  
  // Verify ownership
  // @ts-ignore
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!apt || apt.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Apenas o paciente pode salvar notas pessoais.' });
  }

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
app.get('/api/questionnaires/templates', authenticateToken, (req: any, res) => {
  const templates = db.prepare('SELECT * FROM questionnaire_templates').all();
  res.json(templates);
});

app.get('/api/questionnaires/templates/:id', authenticateToken, (req: any, res) => {
  const template = db.prepare('SELECT * FROM questionnaire_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  
  const questions = db.prepare('SELECT * FROM questions WHERE template_id = ? ORDER BY sort_order').all();
  res.json({ ...template, questions: questions.map((q: any) => ({ ...q, options: JSON.parse(q.options_json || '[]') })) });
});

app.post('/api/questionnaires/assign', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'Acesso negado.' });
  const psychologistId = req.user.id;
  const { patientId, templateId, dueDate } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO questionnaire_assignments (id, patient_id, psychologist_id, template_id, assigned_at, due_date) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, patientId, psychologistId, templateId, new Date().toISOString(), dueDate);
  res.json({ id });
});

app.get('/api/questionnaires/assignments', authenticateToken, (req: any, res) => {
  const { patientId, psychologistId } = req.query;
  const userId = req.user.id;
  const role = req.user.role;

  if (role === 'patient' && patientId !== userId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  if (role === 'psychologist' && psychologistId !== userId && !patientId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

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

app.get('/api/questionnaires/assignments/:id', authenticateToken, (req: any, res) => {
  const assignment = db.prepare(`
    SELECT a.*, t.name as template_name, t.instructions, t.description
    FROM questionnaire_assignments a
    JOIN questionnaire_templates t ON a.template_id = t.id
    WHERE a.id = ?
  `).get(req.params.id);
  
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  
  // Verify ownership
  if (assignment.patient_id !== req.user.id && assignment.psychologist_id !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const questions = db.prepare('SELECT * FROM questions WHERE template_id = ? ORDER BY sort_order').all();
  res.json({ 
    ...assignment, 
    questions: questions.map((q: any) => ({ ...q, options: JSON.parse(q.options_json || '[]') })) 
  });
});

app.post('/api/questionnaires/responses', authenticateToken, (req: any, res) => {
  const { assignment_id, answers } = req.body;
  const id = uuidv4();
  const respondedAt = new Date().toISOString();
  
  // Verify ownership and status
  const assignment = db.prepare(`
    SELECT a.template_id, a.patient_id, t.is_standardized 
    FROM questionnaire_assignments a
    JOIN questionnaire_templates t ON a.template_id = t.id
    WHERE a.id = ?
  `).get(assignment_id);

  if (!assignment || assignment.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

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

app.get('/api/questionnaires/results/:patientId', authenticateToken, (req: any, res) => {
  const { patientId } = req.params;
  
  if (req.user.role === 'patient' && req.user.id !== patientId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const results = db.prepare(`
    SELECT r.*, a.assigned_at, t.name as template_name, t.is_standardized
    FROM questionnaire_responses r
    JOIN questionnaire_assignments a ON r.assignment_id = a.id
    JOIN questionnaire_templates t ON a.template_id = t.id
    WHERE a.patient_id = ?
    ORDER BY r.responded_at DESC
  `).all(patientId);
  
  res.json(results.map((r: any) => ({
    ...r,
    answers: JSON.parse(r.answers_json),
    scores: JSON.parse(r.scores_json)
  })));
});

// AI Analysis
app.post('/api/ai/analyze-session', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'psychologist') return res.status(403).json({ error: 'Acesso negado.' });
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
app.get('/api/messages', authenticateToken, (req: any, res) => {
  const { contactId } = req.query;
  const userId = req.user.id;
  // @ts-ignore
  const messages = db.prepare(`
    SELECT * FROM messages 
    WHERE (sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?)
    ORDER BY timestamp ASC
  `).all(userId, contactId, contactId, userId);
  res.json(messages);
});

app.post('/api/messages', authenticateToken, (req: any, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user.id;
  const id = uuidv4();
  const timestamp = new Date().toISOString();
  
  // @ts-ignore
  db.prepare('INSERT INTO messages (id, sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, ?, ?)').run(id, senderId, receiverId, content, timestamp);
  
  const message = { id, sender_id: senderId, receiver_id: receiverId, content, timestamp };
  io.to(receiverId).emit('receive-message', message);
  res.json(message);
});

// Contacts (Psychologist <-> Patient)
app.get('/api/contacts', authenticateToken, (req: any, res) => {
  const { role } = req.user;
  let contacts;
  
  if (role === 'psychologist') {
    // Get all patients
    // @ts-ignore
    contacts = db.prepare("SELECT id, name, avatar, email FROM users WHERE role = 'patient'").all();
  } else if (role === 'patient') {
    // Get all psychologists
    // @ts-ignore
    contacts = db.prepare("SELECT id, name, avatar, email FROM users WHERE role = 'psychologist'").all();
  } else {
    contacts = [];
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

app.post('/api/psychologists/:id/availability', authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const { availability } = req.body; // Array of { day_of_week, start_time, end_time }

  if (req.user.id !== id || req.user.role !== 'psychologist') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

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
app.post('/api/appointments', authenticateToken, async (req: any, res) => {
  const { psychologistId, patientId, date } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (role === 'patient' && patientId !== userId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  if (role === 'psychologist' && psychologistId !== userId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

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
app.get('/api/journal/:userId', authenticateToken, (req: any, res) => {
  const { userId } = req.params;
  if (req.user.id !== userId && req.user.role !== 'psychologist') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  // Reuse mood_logs as journal entries for now, or create separate table
  // Using mood_logs for simplicity as it has 'note'
  // @ts-ignore
  const logs = db.prepare('SELECT * FROM mood_logs WHERE patient_id = ? ORDER BY date DESC').all(userId);
  res.json(logs);
});

// Mercado Pago Integration
app.post('/api/payments/create-preference', authenticateToken, async (req: any, res) => {
  const { appointmentId, title, unit_price } = req.body;
  
  if (req.user.role !== 'patient') return res.status(403).json({ error: 'Acesso negado.' });
  
  try {
    // Verify appointment belongs to patient
    // @ts-ignore
    const appointment = db.prepare(`
      SELECT a.*, u.mercadopago_access_token 
      FROM appointments a 
      JOIN users u ON a.psychologist_id = u.id 
      WHERE a.id = ? AND a.patient_id = ?
    `).get(appointmentId, req.user.id);

    if (!appointment) {
      return res.status(403).json({ error: 'Agendamento não encontrado ou acesso negado.' });
    }

    const client = new MercadoPagoConfig({ accessToken: appointment.mercadopago_access_token });
    const preference = new Preference(client);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const appUrl = `${protocol}://${host}`;

    const result = await preference.create({
      body: {
        items: [
          {
            id: appointmentId,
            title: title || 'Sessão de Terapia',
            unit_price: Number(unit_price) || 150.0,
            quantity: 1,
            currency_id: 'BRL'
          }
        ],
        back_urls: {
          success: `${appUrl}/dashboard/appointments?payment=success`,
          failure: `${appUrl}/dashboard/appointments?payment=failure`,
          pending: `${appUrl}/dashboard/appointments?payment=pending`,
        },
        auto_return: 'approved',
        external_reference: appointmentId,
        notification_url: `${appUrl}/api/payments/webhook`
      }
    });

    res.json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error('Mercado Pago Error:', error);
    res.status(500).json({ error: 'Erro ao criar preferência de pagamento.' });
  }
});

app.post('/api/payments/webhook', async (req, res) => {
  const { action, data, type } = req.body;
  
  // In a production app, we MUST verify the signature from Mercado Pago
  // const signature = req.headers['x-signature'];
  // if (!verifyMercadoPagoSignature(signature, req.body)) {
  //   return res.status(403).send('Invalid signature');
  // }

  console.log('Webhook received:', { type, action, data });
  
  if (type === 'payment' && (action === 'payment.created' || action === 'payment.updated')) {
    const paymentId = data.id;
    
    try {
      // Fetch payment details from Mercado Pago to get the external_reference (appointmentId)
      // This requires the access token of the psychologist who owns the appointment
      // For simplicity in this demo, we'll assume we can find the appointment by payment_id
      // In a real app, you'd use the external_reference sent in the preference
      
      // @ts-ignore
      const appointment = db.prepare('SELECT * FROM appointments WHERE payment_id = ?').get(paymentId);
      
      if (appointment) {
        // Here you would call MP API to get the current status
        // For now, let's simulate the update if we receive a 'payment' type
        // @ts-ignore
        db.prepare('UPDATE appointments SET payment_status = "approved" WHERE payment_id = ?').run(paymentId);
        console.log(`Appointment ${appointment.id} marked as paid via webhook.`);
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
    }
  }
  
  res.status(200).send('OK');
});

app.post('/api/users/:userId/mercadopago-token', authenticateToken, (req: any, res) => {
  const { userId } = req.params;
  const { token } = req.body;
  
  if (req.user.id !== userId || req.user.role !== 'psychologist') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  
  try {
    // @ts-ignore
    db.prepare('UPDATE users SET mercadopago_access_token = ? WHERE id = ?').run(token, userId);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update token' });
  }
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
