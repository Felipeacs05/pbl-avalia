// src/hooks/usePasswordRecovery.ts
import { useCallback, useState } from "react";
import { passwordRecoveryService } from "../services/passwordRecoveryService";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : "Não foi possível concluir a operação. Tente novamente.";
}

// Os dois passos da recuperação: pedir o link e redefinir com o token do link.
// A mensagem de sucesso é exatamente a do backend; o erro é capturado aqui e não chega a quebrar a tela.
export function usePasswordRecovery() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<{ message: string }>) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await action();
      setSuccessMessage(response.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const requestRecovery = useCallback(
    (email: string) => run(() => passwordRecoveryService.requestRecovery(email)),
    [run]
  );

  const resetPassword = useCallback(
    (token: string, newPassword: string) => run(() => passwordRecoveryService.resetPassword(token, newPassword)),
    [run]
  );

  return { requestRecovery, resetPassword, isSubmitting, successMessage, error };
}
