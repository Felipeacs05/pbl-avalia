import axios from 'axios';

// Garante a URL do Spring Boot local no Docker
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const RATE_LIMIT_MESSAGE =
  'Muitas tentativas em pouco tempo. Seu acesso foi temporariamente bloqueado. Aguarde alguns minutos e tente novamente.';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Interceptor para injetar o Token JWT automaticamente apenas em chamadas autenticadas
api.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    const isPublicAuth =
      url.includes('/auth/register') ||
      url.includes('/auth/login') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');

    if (isPublicAuth) {
      if (config.headers) {
        delete config.headers.Authorization;
        delete (config.headers as Record<string, unknown>).authorization;
      }
      return config;
    }

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de erro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('token');
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = '/';
      }
    }

    if (error.response?.status === 429 && error.response.data) {
      error.response.data.message = RATE_LIMIT_MESSAGE;
    }

    console.warn(`⚠️ [AXIOS ERROR] ${error.config?.url}:`, error.response?.status || error.message);
    return Promise.reject(error);
  }
);
