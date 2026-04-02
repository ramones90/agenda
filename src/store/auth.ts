import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: 'psychologist' | 'patient' | 'admin';
  email: string;
  avatar: string;
}

interface AuthState {
  user: User | null;
  mfaRequired: { userId: string } | null;
  login: (role: 'psychologist' | 'patient' | 'admin', email: string, password?: string) => Promise<{ mfaRequired?: boolean }>;
  validateMfa: (userId: string, code: string) => Promise<void>;
  register: (name: string, email: string, password?: string, role?: 'patient', phone?: string, birthDate?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('psiconnect_user') || 'null'),
  mfaRequired: null,
  login: async (role, email, password) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email, password }),
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }
      const data = await response.json();
      
      if (data.mfaRequired) {
        set({ mfaRequired: { userId: data.userId } });
        return { mfaRequired: true };
      }

      localStorage.setItem('psiconnect_user', JSON.stringify(data.user));
      set({ user: data.user, mfaRequired: null });
      return { mfaRequired: false };
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  validateMfa: async (userId, code) => {
    try {
      const response = await fetch('/api/mfa/validate-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'MFA validation failed');
      }
      const { user } = await response.json();
      localStorage.setItem('psiconnect_user', JSON.stringify(user));
      set({ user, mfaRequired: null });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  register: async (name, email, password, role = 'patient', phone, birthDate) => {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, phone, birthDate }),
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }
      // Registration doesn't auto-login now for security
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  logout: async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout failed', e);
    }
    localStorage.removeItem('psiconnect_user');
    set({ user: null });
  },
  checkAuth: () => {
    const userStr = localStorage.getItem('psiconnect_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user });
      } catch (e) {
        localStorage.removeItem('psiconnect_user');
      }
    }
  },
}));
