import { create } from 'zustand';
import { api, TOKEN_KEY } from '../services/api';
import type { Usuario } from '../types';

const USUARIO_KEY = 'rv_usuario';

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  autenticado: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
}

function usuarioGuardado(): Usuario | null {
  const raw = localStorage.getItem(USUARIO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  usuario: usuarioGuardado(),
  autenticado: Boolean(localStorage.getItem(TOKEN_KEY)),

  login: async (usuario, password) => {
    const { data } = await api.post<{ accessToken: string; usuario: Usuario }>('/auth/login', {
      usuario,
      password,
    });
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(data.usuario));
    set({ token: data.accessToken, usuario: data.usuario, autenticado: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    set({ token: null, usuario: null, autenticado: false });
  },
}));
