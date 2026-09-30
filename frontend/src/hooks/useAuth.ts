// src/hooks/useAuth.ts
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { LoginCredentials } from '@/types/login';

export function useAuth() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function login(credentials: LoginCredentials) {
    setErro(null);
    setCarregando(true);

    try {
      const data = await authService.login(credentials);

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
      }

      router.push('/professor-salas');
    } catch (err: unknown) {
      // Trata o tipo unknown de forma segura sem usar 'any'
      let mensagem = 'Erro ao realizar login. Verifique seus dados de acesso.';

      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
      ) {
        mensagem = (err as { response: { data: { message: string } } }).response.data.message;
      }

      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }

  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      router.push('/login'); // ====== ALTERADO POR CLAUDE ====== (login movido para /login)
    }
  }

  return { login, logout, carregando, erro };
}