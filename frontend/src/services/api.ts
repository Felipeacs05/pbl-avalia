// src/services/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
});

// Interceptor para injetar o token JWT e logar requisições
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Log para depurar e ver a rota completa sendo chamada
    console.log(`🚀 [AXIOS OUT] ${config.method?.toUpperCase()} -> ${config.baseURL}${config.url}`);

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de resposta
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [AXIOS IN] ${response.status} <- ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ [AXIOS ERROR] ${error.config?.url}:`, error.response?.status || error.message);

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }

    if (error.response?.status === 429) {
      error.response.data = {
        ...(typeof error.response.data === 'object' ? error.response.data : {}),
        message: 'Muitas tentativas em pouco tempo. Seu acesso foi temporariamente bloqueado. Aguarde alguns minutos e tente novamente.',
      };
    }

    return Promise.reject(error);
  }
);