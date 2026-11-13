// src/services/authService.ts
import { api } from './api';
import { authMockSuccess } from '../mocks/auth.mock';
import { LoginCredentials } from '@/types/login';
import { AuthResponse } from '@/types/auth';
import { USE_REAL_API } from './apiMode';

// false = backend funcionando true = chamada simulada
const USE_MOCKS = !USE_REAL_API;

export const authService = {
  async login(credentials: LoginCredentials, useMock: boolean = USE_MOCKS): Promise<AuthResponse> {
    if (useMock) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (credentials.password === '123456') {
            resolve(authMockSuccess);
          } else {
            // PRD: Mensagem genérica "Credenciais inválidas." sem revelar se o e-mail existe
            reject({
              response: {
                data: {
                  message: 'Credenciais inválidas.',
                },
              },
            });
          }
        }, 1000); // 1 seg para simular a internet 
      });
    }

    // Chamada real para a API
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },
};
