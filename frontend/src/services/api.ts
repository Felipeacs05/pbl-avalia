import axios from 'axios';

// Garante a URL do Spring Boot local no Docker
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Necessário quando o backend possui configuration.setAllowCredentials(true)
});

// Interceptor para injetar o Token JWT automaticamente em chamadas autenticadas
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
  (error) => Promise.reject(error)
);

// Interceptor de erro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(`❌ [AXIOS ERROR] ${error.config?.url}:`, error.response?.status || error.message);
    return Promise.reject(error);
  }
);