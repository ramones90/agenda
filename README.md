# PsiConnect - Plataforma de Saúde Mental

Plataforma completa para psicólogos e pacientes com telemedicina, prontuário eletrônico e inteligência artificial.

## 🚀 Funcionalidades

- **Área do Psicólogo**: Dashboard, Agenda, Prontuário com IA.
- **Área do Paciente**: Diário de Humor, Histórico, Sala de Espera.
- **Área Administrativa**: Cadastro e gestão de profissionais.
- **Videochamada**: WebRTC nativo com quadro branco colaborativo.
- **IA (Gemini)**: Análise de sentimento e resumo de sessões.

## 🛠️ Configuração

### 1. Instalação

O projeto já vem com as dependências instaladas. Se precisar reinstalar:

```bash
npm install
```

### 2. Banco de Dados

O banco de dados SQLite é criado automaticamente. Para resetar e popular com dados de exemplo:

```bash
npm run db:reset
```

### 3. Execução

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse em: `http://localhost:3000`

## 🔑 Acesso (Contas de Demonstração)

**Admin:**
- Email: `admin@psiconnect.com`
- Role: Admin

**Psicólogo:**
- Email: `ana@psiconnect.com`
- Role: Psicólogo

**Paciente:**
- Email: `carlos@email.com`
- Role: Paciente

> **Nota:** Na tela de login, você pode deixar o campo de email em branco para entrar automaticamente com uma conta de teste do perfil selecionado.

## 📹 Videochamada

Para testar a videochamada:
1. Abra o navegador em uma aba anônima (ou outro browser).
2. Logue como **Psicólogo** em uma aba.
3. Logue como **Paciente** na outra.
4. O paciente verá o botão "Entrar na Sala" no dashboard.
5. O psicólogo pode entrar clicando no ícone de vídeo na lista de sessões.

## 🤖 Inteligência Artificial

Para que a IA funcione (análise de sessões), você precisa configurar a chave da API do Gemini no `.env`:

```env
GEMINI_API_KEY="sua_chave_aqui"
```

## 🔗 Links e Páginas Registradas

Aqui estão os links diretos para as páginas principais da aplicação. Para acessá-las, adicione o caminho à URL base da aplicação (ex: `http://localhost:3000/login/patient`).

### Públicas / Autenticação
- **Página Inicial / Cadastro de Paciente:** `/`
- **Login de Paciente:** `/login/patient`
- **Login de Psicólogo:** `/login/psychologist`
- **Login de Administrador:** `/login/admin`

### Área Restrita (Requer Login)
- **Dashboard Principal:** `/dashboard` *(O conteúdo muda dependendo do seu perfil: Paciente, Psicólogo ou Admin)*
- **Mensagens:** `/dashboard/messages`
- **Agenda / Calendário:** `/dashboard/calendar`
- **Diário (Paciente):** `/dashboard/journal`
- **Meus Pacientes (Psicólogo):** `/dashboard/patients`
- **Questionários (Psicólogo):** `/dashboard/questionnaires`
- **Meu Perfil:** `/dashboard/profile`

### Funcionalidades Específicas
- **Responder Questionário (Paciente):** `/questionnaire/:id` *(Requer o ID do questionário)*
- **Sala de Espera:** `/waiting-room/:id` *(Requer o ID da consulta)*
- **Sala de Videochamada:** `/room/:id` *(Requer o ID da consulta)*
