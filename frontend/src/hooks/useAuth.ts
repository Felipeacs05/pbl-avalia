// src/hooks/useAuth.ts
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { LoginCredentials } from '@/types/login';

//src/hooks/useAuth.ts

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function login(credentials: LoginCredentials) {
    setError(null);
    setIsLoading(true);

    try {
      const normalizedCredentials: LoginCredentials = {
        ...credentials,
        email: credentials.email ? credentials.email.trim().toLowerCase() : credentials.email,
      };
      const data = await authService.login(normalizedCredentials);

      if (typeof window !== 'undefined' && data?.token) {
        localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }

      const pendingCode = typeof window !== 'undefined' ? localStorage.getItem('pendingJoinCode') : null;
      if (pendingCode) {
        localStorage.removeItem('pendingJoinCode');
        router.push(`/app/join/${pendingCode}`);
      } else {
        router.push('/teacher-rooms');
      }
    } catch (err: unknown) {
      // Trata o tipo unknown de forma segura sem usar 'any'
      let message = 'Erro ao realizar login. Verifique seus dados de acesso.';

      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ) {
        message = (err as { response: { data: { message: string } } }).response.data.message;
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  }

  return { login, logout, isLoading, error };
}
