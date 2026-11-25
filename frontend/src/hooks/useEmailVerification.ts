// src/hooks/useEmailVerification.ts
// Confirmação da conta pelo código enviado por e-mail (US22)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { emailVerificationService } from "@/services/emailVerificationService";

// Depois de confirmar, volta às salas (mesmo destino do login)
const AFTER_VERIFY_ROUTE = "/teacher-rooms";
// Tempo para o usuário ler a confirmação antes de sair da tela
const REDIRECT_DELAY_MS = 1500;
const DEFAULT_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

export function useEmailVerification() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(request: () => Promise<{ message: string }>): Promise<boolean> {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const { message } = await request();
      setSuccessMessage(message);
      return true;
    } catch (err) {
      setError((err as { message?: string })?.message || DEFAULT_ERROR_MESSAGE);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyEmail(email: string, code: string): Promise<void> {
    const ok = await run(() => emailVerificationService.verifyEmail(email, code));
    if (ok) setTimeout(() => router.push(AFTER_VERIFY_ROUTE), REDIRECT_DELAY_MS);
  }

  // Reenviar não confirma a conta: o usuário continua na tela para digitar o novo código
  async function resendVerification(email: string): Promise<void> {
    await run(() => emailVerificationService.resendVerification(email));
  }

  return { verifyEmail, resendVerification, isSubmitting, successMessage, error };
}
