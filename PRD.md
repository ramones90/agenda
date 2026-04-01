# Product Requirement Document (PRD) - PsiConnect 2026

## 1. Visão Geral do Produto
**Nome:** PsiConnect
**Missão:** Democratizar o acesso à saúde mental de qualidade através de uma plataforma que une tecnologia humanizada, segurança de dados e engajamento terapêutico.
**Público-Alvo:** Psicólogos clínicos e seus pacientes.

## 2. Pilares da Plataforma

### 2.1 Área do Psicólogo (O Consultório Digital Pro)
Focado em eficiência, insights clínicos e redução de tarefas administrativas.

*   **Dashboard Clínico Inteligente:**
    *   *Feature:* "Insights do Dia" gerados por IA (resumo de prontuários, alertas de risco).
    *   *Tech:* Processamento de Linguagem Natural (NLP) via Gemini API para análise de sentimento (com consentimento).
*   **Prontuário Evolutivo:**
    *   *Feature:* Timeline visual, busca semântica, templates (TCC, Psicanálise).
*   **Agenda Omnicanal:**
    *   *Feature:* Sincronização bidirecional (Google/Outlook), lembretes automáticos via WhatsApp (API Business).

### 2.2 Área do Paciente (A Jornada de Cuidado)
Focado em acolhimento, adesão e autoconhecimento.

*   **Portal Gamificado:**
    *   *Feature:* Check-in emocional diário, sistema de "streaks" (dias consecutivos de cuidado).
*   **Biblioteca Pessoal:**
    *   *Feature:* Acesso a materiais psicoeducativos prescritos pelo terapeuta.

### 2.3 Sala de Atendimento Síncrona (Videoconferência)
*   **Tech:** WebRTC (Peer-to-Peer) criptografado.
*   **Recursos:**
    *   Quadro branco colaborativo (Canvas API).
    *   "AI Scribe": Transcrição e rascunho de anotações em tempo real (Speech-to-Text).
    *   Sala de espera com conteúdo de mindfulness.

## 3. Arquitetura Técnica (Stack Sugerida)

### Frontend
*   **Framework:** React 19 (Vite)
*   **Linguagem:** TypeScript
*   **Estilização:** Tailwind CSS (Design System consistente)
*   **Animações:** Motion (para micro-interações fluidas)
*   **Gerenciamento de Estado:** Zustand

### Backend & Infraestrutura
*   **Runtime:** Node.js (Express)
*   **Banco de Dados:** SQLite (MVP) / PostgreSQL (Produção)
*   **AI Engine:** Google Gemini API (Análise de texto, sugestões, insights)
*   **Real-time:** WebSockets (Socket.io) para chat e sinalização de vídeo.

### Segurança & Compliance (LGPD)
*   **Criptografia:** Dados em repouso (AES-256) e em trânsito (TLS 1.3).
*   **Anonimização:** Remoção de PII (Personal Identifiable Information) antes do envio para APIs de IA.

## 4. Plano de MVP (Escopo Inicial)
Para a validação imediata, o MVP incluirá:
1.  **Login Dual:** Acesso diferenciado para Terapeuta e Paciente.
2.  **Dashboard do Terapeuta:** Lista de pacientes, criação de notas com "AI Enhance" (melhoria de texto via Gemini).
3.  **Dashboard do Paciente:** Registro de humor (Mood Tracker) com gráfico simples.
4.  **Sala de Vídeo (Simulação):** Interface de atendimento com Quadro Branco funcional e anotações laterais.

---
*Documento gerado em 22 de Fevereiro de 2026.*
