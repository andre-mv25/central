import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';

export const TOKEN_KEY = 'rv_token';
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

function generateIdempotencyKey(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error: AxiosError) => {
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return true;
    if (error.response?.status) {
      return error.response.status >= 500 || error.response.status === 429;
    }
    return false;
  },
  onRetry: (retryCount, error) => {
    console.warn(`[axios-retry] Intento ${retryCount}/3: ${error.message}`);
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Agregar Idempotency-Key automáticamente para métodos mutables
  const method = config.method?.toUpperCase();
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method || '')) {
    // Solo si no hay ya una clave (permite override manual)
    if (!config.headers[IDEMPOTENCY_HEADER]) {
      config.headers[IDEMPOTENCY_HEADER] = generateIdempotencyKey();
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('rv_usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join('. ');
    }
    if (typeof message === 'string') {
      return message;
    }
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      return 'No se pudo conectar con el servidor (timeout o red)';
    }
  }
  return 'Ocurrió un error inesperado';
}

export { generateIdempotencyKey };
