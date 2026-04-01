/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { Layout } from './components/Layout';
import LoginPatient from './pages/auth/LoginPatient';
import RegisterPatient from './pages/auth/RegisterPatient';
import LoginPsychologist from './pages/auth/LoginPsychologist';
import LoginAdmin from './pages/auth/LoginAdmin';
import PsychologistDashboard from './pages/PsychologistDashboard';
import PatientDashboard from './pages/PatientDashboard';
import VideoRoom from './pages/VideoRoom';
import AdminDashboard from './pages/AdminDashboard';
import Messages from './pages/Messages';
import CalendarPage from './pages/Calendar';
import Journal from './pages/Journal';
import Patients from './pages/Patients';
import WaitingRoom from './pages/WaitingRoom';
import Profile from './pages/Profile';
import Questionnaires from './pages/Questionnaires';
import AnswerQuestionnaire from './pages/AnswerQuestionnaire';
import PatientDetails from './pages/PatientDetails';
import QuestionnaireResponses from './pages/QuestionnaireResponses';
import { useAuthStore } from './store/auth';

function DashboardRouter() {
  const { user } = useAuthStore();
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  if (user?.role === 'psychologist') {
    return <PsychologistDashboard />;
  }
  return <PatientDashboard />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!user ? <RegisterPatient /> : <Navigate to="/dashboard" replace />} />
        <Route path="/login/patient" element={<LoginPatient />} />
        <Route path="/login/psychologist" element={<LoginPsychologist />} />
        <Route path="/login/admin" element={<LoginAdmin />} />
        
        {/* Protected Routes */}
        <Route path="/room/:id" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
        <Route path="/waiting-room/:id" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />
        <Route path="/questionnaire/:id" element={<ProtectedRoute><AnswerQuestionnaire /></ProtectedRoute>} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardRouter />} />
          <Route path="messages" element={<Messages />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="journal" element={<Journal />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<PatientDetails />} />
          <Route path="profile" element={<Profile />} />
          <Route path="questionnaires" element={<Questionnaires />} />
          <Route path="questionnaires/responses/:id" element={<QuestionnaireResponses />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
