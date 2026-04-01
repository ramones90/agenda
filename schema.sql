-- Banco de Dados: psiconnect
-- Script de Criação para MySQL / MariaDB (XAMPP)

CREATE DATABASE IF NOT EXISTS psiconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE psiconnect;

-- --------------------------------------------------------
-- Estrutura das Tabelas
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK(role IN ('psychologist', 'patient', 'admin')),
  email VARCHAR(255) UNIQUE NOT NULL,
  avatar VARCHAR(255),
  phone VARCHAR(50),
  birthDate DATE,
  google_refresh_token TEXT,
  google_calendar_id VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(255) PRIMARY KEY,
  psychologist_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  date DATETIME NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  google_calendar_event_id VARCHAR(255),
  FOREIGN KEY(psychologist_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mood_logs (
  id VARCHAR(255) PRIMARY KEY,
  patient_id VARCHAR(255) NOT NULL,
  date DATETIME NOT NULL,
  score INT NOT NULL CHECK(score >= 1 AND score <= 5),
  note TEXT,
  FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session_notes (
  id VARCHAR(255) PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL,
  content TEXT,
  ai_summary TEXT,
  FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  sender_id VARCHAR(255) NOT NULL,
  receiver_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  `read` TINYINT(1) DEFAULT 0,
  FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(255) PRIMARY KEY,
  psychologist_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'article', 'video', 'exercise'
  content_url VARCHAR(255),
  description TEXT,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(psychologist_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  psychologist_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
  due_date DATETIME,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(psychologist_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS appointment_notes (
  id VARCHAR(255) PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL UNIQUE,
  patient_notes TEXT,
  FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  is_standardized TINYINT(1) DEFAULT 0,
  formula_json TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR(255) PRIMARY KEY,
  template_id VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'likert', 'text'
  sort_order INT NOT NULL,
  options_json TEXT,
  FOREIGN KEY(template_id) REFERENCES questionnaire_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questionnaire_assignments (
  id VARCHAR(255) PRIMARY KEY,
  patient_id VARCHAR(255) NOT NULL,
  psychologist_id VARCHAR(255) NOT NULL,
  template_id VARCHAR(255) NOT NULL,
  assigned_at DATETIME NOT NULL,
  due_date DATETIME,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired'
  FOREIGN KEY(patient_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(psychologist_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(template_id) REFERENCES questionnaire_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id VARCHAR(255) PRIMARY KEY,
  assignment_id VARCHAR(255) NOT NULL UNIQUE,
  responded_at DATETIME NOT NULL,
  answers_json TEXT NOT NULL,
  scores_json TEXT,
  FOREIGN KEY(assignment_id) REFERENCES questionnaire_assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Inserção de Dados Iniciais (Seed)
-- --------------------------------------------------------

-- Inserir Usuários (Admin e Psicólogo)
INSERT IGNORE INTO users (id, name, role, email, avatar) VALUES 
('admin-1', 'Administrador', 'admin', 'admin@psiconnect.com', 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'),
('psico-1', 'Dr. Roberto Santos', 'psychologist', 'roberto@psiconnect.com', 'https://images.unsplash.com/photo-1559839734-2b71f1536783?auto=format&fit=crop&q=80&w=200&h=200');

-- Inserir Templates de Questionários (PHQ-9 e GAD-7)
INSERT IGNORE INTO questionnaire_templates (id, name, description, instructions, is_standardized) VALUES 
('template-phq9', 'PHQ-9 (Questionário sobre Saúde do Paciente)', 'Instrumento para rastreamento de depressão.', 'Nas últimas 2 semanas, com que frequência você foi incomodado pelos problemas abaixo?', 1),
('template-gad7', 'GAD-7 (Escala de Transtorno de Ansiedade Generalizada)', 'Instrumento para rastreamento de ansiedade.', 'Nas últimas 2 semanas, com que frequência você foi incomodado pelos problemas abaixo?', 1);

-- Inserir Perguntas dos Questionários
INSERT IGNORE INTO questions (id, template_id, text, type, sort_order, options_json) VALUES 
('q-phq9-0', 'template-phq9', 'Pouco interesse ou prazer em fazer as coisas', 'likert', 0, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-phq9-1', 'template-phq9', 'Sentir-se para baixo, deprimido ou sem perspectiva', 'likert', 1, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-phq9-2', 'template-phq9', 'Dificuldade para pegar no sono ou permanecer dormindo, ou dormir demais', 'likert', 2, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-phq9-3', 'template-phq9', 'Sentir-se cansado ou com pouca energia', 'likert', 3, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-phq9-4', 'template-phq9', 'Falta de apetite ou comer demais', 'likert', 4, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-phq9-5', 'template-phq9', 'Sentir-se mal consigo mesmo - ou achar que você é um fracasso ou que decepcionou sua família ou a si mesmo', 'likert', 5, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-phq9-6', 'template-phq9', 'Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão', 'likert', 6, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-phq9-7', 'template-phq9', 'Mover-se ou falar tão devagar que as outras pessoas poderiam notar? Ou o oposto - estar tão inquieto ou agitado que você circula muito mais do que o habitual', 'likert', 7, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-phq9-8', 'template-phq9', 'Pensamentos de que seria melhor estar morto ou de se ferir de alguma maneira', 'likert', 8, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),

('q-gad7-0', 'template-gad7', 'Sentir-se nervoso, ansioso ou muito tenso', 'likert', 0, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-gad7-1', 'template-gad7', 'Não ser capaz de parar ou controlar a preocupação', 'likert', 1, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-gad7-2', 'template-gad7', 'Preocupar-se demais com diversas coisas', 'likert', 2, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-gad7-3', 'template-gad7', 'Dificuldade para relaxar', 'likert', 3, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-gad7-4', 'template-gad7', 'Ficar tão inquieto que é difícil permanecer sentado', 'likert', 4, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-gad7-5', 'template-gad7', 'Ficar facilmente aborrecido ou irritado', 'likert', 5, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]'),
('q-gad7-6', 'template-gad7', 'Sentir medo como se algo horrível fosse acontecer', 'likert', 6, '[{"label":"Nenhuma vez","value":"0","score":0},{"label":"Vários dias","value":"1","score":1},{"label":"Mais da metade dos dias","value":"2","score":2},{"label":"Quase todos os dias","value":"3","score":3}]');
