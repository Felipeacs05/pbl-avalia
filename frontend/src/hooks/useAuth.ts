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
      const data = await authService.login(credentials);

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
      }

      router.push('/teacher-rooms');
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
      router.push('/');
    }
  }

  return { login, logout, isLoading, error };
}