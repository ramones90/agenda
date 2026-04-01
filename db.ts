import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.resolve('database.sqlite');

let db: Database.Database;

try {
  db = new Database(dbPath);
  // Test if database is valid by running a simple query
  db.prepare('SELECT 1').get();
} catch (error) {
  console.error('Database file corrupted or invalid. Recreating...');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  db = new Database(dbPath);
}

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('psychologist', 'patient', 'admin')),
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    avatar TEXT,
    phone TEXT,
    birthDate TEXT
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    psychologist_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    FOREIGN KEY(psychologist_id) REFERENCES users(id),
    FOREIGN KEY(patient_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS mood_logs (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    date TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
    note TEXT,
    FOREIGN KEY(patient_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS session_notes (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    content TEXT,
    ai_summary TEXT,
    FOREIGN KEY(appointment_id) REFERENCES appointments(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    psychologist_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'article', 'video', 'exercise'
    content_url TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(psychologist_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    psychologist_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
    due_date TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(psychologist_id) REFERENCES users(id),
    FOREIGN KEY(patient_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS appointment_notes (
    id TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL UNIQUE,
    patient_notes TEXT,
    FOREIGN KEY(appointment_id) REFERENCES appointments(id)
  );

  CREATE TABLE IF NOT EXISTS questionnaire_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    is_standardized INTEGER DEFAULT 0,
    formula_json TEXT -- Rules for calculating scores
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL, -- 'multiple_choice', 'likert', 'text'
    sort_order INTEGER NOT NULL,
    options_json TEXT, -- [{label, value, score}]
    FOREIGN KEY(template_id) REFERENCES questionnaire_templates(id)
  );

  CREATE TABLE IF NOT EXISTS questionnaire_assignments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    psychologist_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired'
    FOREIGN KEY(patient_id) REFERENCES users(id),
    FOREIGN KEY(psychologist_id) REFERENCES users(id),
    FOREIGN KEY(template_id) REFERENCES questionnaire_templates(id)
  );

  CREATE TABLE IF NOT EXISTS questionnaire_responses (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL UNIQUE,
    responded_at TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    scores_json TEXT, -- Calculated results
    FOREIGN KEY(assignment_id) REFERENCES questionnaire_assignments(id)
  );

  CREATE TABLE IF NOT EXISTS psychologist_availability (
    id TEXT PRIMARY KEY,
    psychologist_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0 (Sunday) to 6 (Saturday)
    start_time TEXT NOT NULL, -- HH:mm
    end_time TEXT NOT NULL, -- HH:mm
    FOREIGN KEY(psychologist_id) REFERENCES users(id)
  );
`);

// Seed Questionnaires
const templateCount = db.prepare('SELECT count(*) as count FROM questionnaire_templates').get() as { count: number };
if (templateCount.count === 0) {
  console.log('Seeding questionnaire templates...');
  
  // PHQ-9
  const phq9Id = 'template-phq9';
  db.prepare('INSERT INTO questionnaire_templates (id, name, description, instructions, is_standardized) VALUES (?, ?, ?, ?, ?)')
    .run(phq9Id, 'PHQ-9 (Questionário sobre Saúde do Paciente)', 'Instrumento para rastreamento de depressão.', 'Nas últimas 2 semanas, com que frequência você foi incomodado pelos problemas abaixo?', 1);
  
  const phq9Options = JSON.stringify([
    { label: 'Nenhuma vez', value: '0', score: 0 },
    { label: 'Vários dias', value: '1', score: 1 },
    { label: 'Mais da metade dos dias', value: '2', score: 2 },
    { label: 'Quase todos os dias', value: '3', score: 3 }
  ]);

  const phq9Questions = [
    'Pouco interesse ou prazer em fazer as coisas',
    'Sentir-se para baixo, deprimido ou sem perspectiva',
    'Dificuldade para pegar no sono ou permanecer dormindo, ou dormir demais',
    'Sentir-se cansado ou com pouca energia',
    'Falta de apetite ou comer demais',
    'Sentir-se mal consigo mesmo - ou achar que você é um fracasso ou que decepcionou sua família ou a si mesmo',
    'Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão',
    'Mover-se ou falar tão devagar que as outras pessoas poderiam notar? Ou o oposto - estar tão inquieto ou agitado que você circula muito mais do que o habitual',
    'Pensamentos de que seria melhor estar morto ou de se ferir de alguma maneira'
  ];

  phq9Questions.forEach((q, i) => {
    db.prepare('INSERT INTO questions (id, template_id, text, type, sort_order, options_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`q-phq9-${i}`, phq9Id, q, 'likert', i, phq9Options);
  });

  // GAD-7
  const gad7Id = 'template-gad7';
  db.prepare('INSERT INTO questionnaire_templates (id, name, description, instructions, is_standardized) VALUES (?, ?, ?, ?, ?)')
    .run(gad7Id, 'GAD-7 (Escala de Transtorno de Ansiedade Generalizada)', 'Instrumento para rastreamento de ansiedade.', 'Nas últimas 2 semanas, com que frequência você foi incomodado pelos problemas abaixo?', 1);

  const gad7Questions = [
    'Sentir-se nervoso, ansioso ou muito tenso',
    'Não ser capaz de parar ou controlar a preocupação',
    'Preocupar-se demais com diversas coisas',
    'Dificuldade para relaxar',
    'Ficar tão inquieto que é difícil permanecer sentado',
    'Ficar facilmente aborrecido ou irritado',
    'Sentir medo como se algo horrível fosse acontecer'
  ];

  gad7Questions.forEach((q, i) => {
    db.prepare('INSERT INTO questions (id, template_id, text, type, sort_order, options_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(`q-gad7-${i}`, gad7Id, q, 'likert', i, phq9Options);
  });
}

// Migrations
try {
  db.exec('ALTER TABLE users ADD COLUMN password TEXT');
} catch (error) {
  // Column likely already exists
}

try {
  db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
} catch (error) {
  // Column likely already exists
}

try {
  db.exec('ALTER TABLE users ADD COLUMN birthDate TEXT');
} catch (error) {
  // Column likely already exists
}

try {
  db.exec('ALTER TABLE users ADD COLUMN google_refresh_token TEXT');
} catch (error) {
  // Column likely already exists
}

try {
  db.exec('ALTER TABLE users ADD COLUMN google_calendar_id TEXT');
} catch (error) {
  // Column likely already exists
}

try {
  db.exec('ALTER TABLE appointments ADD COLUMN google_calendar_event_id TEXT');
} catch (error) {
  // Column likely already exists
}

// Seed data if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };

if (userCount.count === 0) {
  console.log('Seeding database...');
  const insertUser = db.prepare('INSERT INTO users (id, name, role, email, password, avatar) VALUES (?, ?, ?, ?, ?, ?)');
  
  // Admin
  insertUser.run('admin-1', 'Administrador', 'admin', 'admin@psiconnect.com', bcrypt.hashSync('admin123', 10), 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff');

  // Psychologist
  insertUser.run('psico-1', 'Dr. Roberto Santos', 'psychologist', 'roberto@psiconnect.com', bcrypt.hashSync('psico123', 10), 'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200&h=200');

  // Availability for psico-1 (Mon-Fri, 08:00-18:00)
  const insertAvail = db.prepare('INSERT INTO psychologist_availability (id, psychologist_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)');
  for (let i = 1; i <= 5; i++) {
    insertAvail.run(uuidv4(), 'psico-1', i, '08:00', '18:00');
  }

  console.log('Seed users and availability created: admin@psiconnect.com, roberto@psiconnect.com');
}

export default db;
