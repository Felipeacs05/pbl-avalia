// src/services/authService.ts
import { api } from './api';
import { authMockSuccess } from '../mocks/auth.mock';
import { LoginCredentials } from '@/types/login';
import { AuthResponse } from '@/types/auth';
// false = backend funcionando true = chamada simulada
const USE_MOCK = true;

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (credentials.password === '123456') {
            resolve(authMockSuccess);
          } else {
            reject({
              response: {
                data: {
                  message: 'E-mail ou senha incorretos.',
                },
              },
            });
          }
        }, 1000); // 1 seg para simular a internet 
      });
    }

    // usar quando o backend tiver pronto
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },
};