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
  login: (role: 'psychologist' | 'patient' | 'admin', email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password?: string, role?: 'patient', phone?: string, birthDate?: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: async (role, email, password) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email, password }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }
      const user = await response.json();
      set({ user });
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
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }
      const user = await response.json();
      set({ user });
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  logout: () => set({ user: null }),
}));
