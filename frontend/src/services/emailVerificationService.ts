// src/services/emailVerificationService.ts
// Verificação de e-mail (US22). Erros no contrato { status, message }; status 0 = sem resposta (rede).
import axios from "axios";
import { api } from "./api";
import { USE_REAL_API } from "./apiMode";
import type { EmailVerificationMessageResponse } from "../types/emailVerification";

// COMBINAR COM O BACK-END (AuthController em /api/v1/auth, pela instância axios de api.ts):
//  - Rotas abaixo, relativas ao baseURL do axios. Se o backend mudar, troque só estas constantes
//    (e os testes da US22, que fixam a rota).
//  - POST verify-email: { email, code } -> { message }. Código errado/usado: 400; expirado: 403.
//  - POST resend-verification: { email } -> { message }. Um novo código invalida os anteriores.
//  - As duas rotas precisam estar liberadas no SecurityConfig (hoje só register e login estão em permitAll).
//  - O 403 de "e-mail não verificado" em POST /rooms e POST /rooms/join precisa trazer o campo "code"
//    (ver src/services/emailNotVerified.ts).
//  - Para sair do mock, rode com NEXT_PUBLIC_USE_MOCKS=false.
const VERIFY_EMAIL_URL = "/auth/verify-email";
const RESEND_VERIFICATION_URL = "/auth/resend-verification";

const DEFAULT_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";
const NETWORK_ERROR_MESSAGE = "Sem conexão com o servidor. Tente novamente.";

// Modo mock: este código simula o código inválido ou expirado; qualquer outro é aceito
const MOCK_INVALID_CODE = "000000";

function toServiceError(error: unknown): { status: number; message: string } {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data as { message?: string; error?: string } | string | undefined;
    const message = typeof data === "object" && data ? data.message || data.error : undefined;
    return { status: error.response.status, message: message || DEFAULT_ERROR_MESSAGE };
  }
  return { status: 0, message: NETWORK_ERROR_MESSAGE };
}

async function post(url: string, body: unknown): Promise<EmailVerificationMessageResponse> {
  try {
    const { data } = await api.post<EmailVerificationMessageResponse>(url, body);
    return data;
  } catch (error) {
    throw toServiceError(error);
  }
}

function mockDelay<T>(value: () => T): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(value());
      } catch (error) {
        reject(error);
      }
    }, 600)
  );
}

export const emailVerificationService = {
  async verifyEmail(email: string, code: string): Promise<EmailVerificationMessageResponse> {
    if (!USE_REAL_API) {
      return mockDelay(() => {
        if (code === MOCK_INVALID_CODE) throw { status: 400, message: "Código inválido ou expirado." };
        return { message: "E-mail verificado com sucesso." };
      });
    }
    return post(VERIFY_EMAIL_URL, { email, code });
  },

  async resendVerification(email: string): Promise<EmailVerificationMessageResponse> {
    if (!USE_REAL_API) return mockDelay(() => ({ message: "Enviamos um novo código para o seu e-mail." }));
    return post(RESEND_VERIFICATION_URL, { email });
  },
};
