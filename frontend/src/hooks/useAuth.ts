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
      // O 'await' FAZ O CODIGO ESPERAR o resultado da Promise do authService
      const data = await authService.login(credentials);

      // Se a senha for '123456', o authService dá resolve e o código CONTINUA aqui:
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
      }

      router.push('/professor-salas');
    } catch (err: any) {
      // Se a senha for diferente, o authService dá reject e o código PULA para cá:
      const mensagem =
        err.response?.data?.message ||
        'Erro ao realizar login. Verifique seus dados de acesso.';
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }

  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      router.push('/');
    }
  }

  return { login, logout, carregando, erro };
}