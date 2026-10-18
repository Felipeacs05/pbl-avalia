// src/services/api.ts
import axios from 'axios';

//src/services/api.ts (USO AXIOS PARA REQUISIÇÕES HTTP)

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injetar o token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros globais (ex: 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }
    
// 429 (Too Many Requests): IP bloqueado por excesso de requisições.
    if (error.response?.status === 429) {
      error.response.data = {
        ...(typeof error.response.data === 'object' ? error.response.data : {}),
        message: 'Muitas tentativas em pouco tempo. Seu acesso foi temporariamente bloqueado. Aguarde alguns minutos e tente novamente.',
      };
    }

    return Promise.reject(error);
  }
); 