// src/hooks/useChangePassword.ts
// Troca de senha com confirmação da senha atual (US23)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { profileService } from "@/services/profileService";

// Tempo para o usuário ler a confirmação antes de voltar ao login
const REDIRECT_DELAY_MS = 1500;
const CURRENT_REQUIRED_MESSAGE = "Informe a senha atual.";
const NEW_REQUIRED_MESSAGE = "Informe a nova senha.";
const SAME_PASSWORD_MESSAGE = "A nova senha deve ser diferente da atual.";
const DEFAULT_ERROR_MESSAGE = "Não foi possível alterar a senha. Tente novamente.";

export function useChangePassword() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // O backend revoga o token atual na troca de senha: a sessão local precisa acabar
  function endSession(delay: number) {
    setTimeout(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/");
    }, delay);
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    setSuccessMessage(null);
    if (!currentPassword) return setError(CURRENT_REQUIRED_MESSAGE);
    if (!newPassword.trim()) return setError(NEW_REQUIRED_MESSAGE);
    if (newPassword === currentPassword) return setError(SAME_PASSWORD_MESSAGE);

    setError(null);
    setIsSubmitting(true);
    try {
      const { message } = await profileService.changePassword({ currentPassword, newPassword });
      setSuccessMessage(message);
      endSession(REDIRECT_DELAY_MS);
    } catch (err) {
      const { status, message } = (err ?? {}) as { status?: number; message?: string };
      setError(message || DEFAULT_ERROR_MESSAGE);
      if (status === 401) endSession(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { changePassword, isSubmitting, successMessage, error };
}
