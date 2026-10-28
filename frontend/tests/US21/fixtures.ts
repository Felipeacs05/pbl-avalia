import type { PasswordMessageResponse } from "@/types/passwordRecovery";

// Mesmos dados do PasswordRecoveryIntegrationTest (backend da US21)
export const REGISTERED_EMAIL = "joao@uefs.br";
export const UNREGISTERED_EMAIL = "naoexiste@uefs.br";
export const OLD_PASSWORD = "senhaAntiga123";
export const NEW_PASSWORD = "novaSenhaForte456";

// O backend gera o token com UUID.randomUUID(); aqui ficam fixos
export const RESET_TOKEN = "211e2121-e21b-21d2-a121-212121212121";
export const USED_TOKEN = "212e2121-e21b-21d2-a121-212121212122";
export const EXPIRED_TOKEN = "213e2121-e21b-21d2-a121-212121212123";

// Textos exatos do backend da US21; nas asserções, as regex
export const RECOVERY_TEXT = "Se o e-mail estiver cadastrado, você receberá um link de recuperação.";
export const RESET_SUCCESS_TEXT = "Senha redefinida com sucesso.";
export const RESET_SUCCESS_MESSAGE = /senha redefinida com sucesso/i;
export const INVALID_TOKEN_TEXT = "Token inválido ou expirado.";
export const INVALID_TOKEN_MESSAGE = /token inválido ou expirado/i;

// O 400 do token vem no campo "error", e não em "message" ($.error no teste do backend)
export const BACKEND_INVALID_TOKEN_BODY = { error: INVALID_TOKEN_TEXT };

// Contrato de erro do service: { status, message }
export const makeInvalidTokenError = () => ({ status: 400, message: INVALID_TOKEN_TEXT });

export const makeRecoveryResponse = (): PasswordMessageResponse => ({ message: RECOVERY_TEXT });

export const makeResetResponse = (): PasswordMessageResponse => ({ message: RESET_SUCCESS_TEXT });
