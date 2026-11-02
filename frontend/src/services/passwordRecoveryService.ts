// src/services/passwordRecoveryService.ts
// Recuperação de senha (US21). Erros no contrato { status, message }; status 0 = sem resposta (rede).
import type { PasswordMessageResponse } from "../types/passwordRecovery";
import { USE_REAL_API } from "./apiMode";

// Rotas do backend da US21: ficam fora do prefixo /api/v1
// COMBINAR COM O BACK-END:
//  - As rotas abaixo seguem os testes da US21 (copiados do teste do backend), sem o /api/v1.
//    Se o backend usar /api/v1/auth/password/..., troque só estas duas constantes
//    (e os testes da US21, que fixam a rota).
//  - O link enviado por e-mail deve apontar para a página do front: /reset-password?token=<token>
//  - O backend é alcançado pelo rewrite do next.config.ts (/api/* -> BACKEND_URL); para sair do mock,
//    rode com NEXT_PUBLIC_USE_MOCKS=false.
const RECOVER_URL = "/api/auth/password/recover";
const RESET_URL = "/api/auth/password/reset";

// Textos do backend, usados também pelo modo mock
const RECOVERY_MESSAGE = "Se o e-mail estiver cadastrado, você receberá um link de recuperação.";
const RESET_SUCCESS_MESSAGE = "Senha redefinida com sucesso.";
const INVALID_TOKEN_MESSAGE = "Token inválido ou expirado.";
const DEFAULT_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";
const NETWORK_ERROR_MESSAGE = "Sem conexão com o servidor. Tente novamente.";

// Modo mock: estes tokens simulam o link já usado ou vencido; qualquer outro é aceito
const MOCK_INVALID_TOKENS = ["usado", "expirado"];

async function postJson(url: string, body: unknown): Promise<PasswordMessageResponse> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw { status: 0, message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    // O 400 do token vem no campo "error"; os demais podem vir em "message"
    throw { status: response.status, message: data?.error || data?.message || DEFAULT_ERROR_MESSAGE };
  }
  return response.json();
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

export const passwordRecoveryService = {
  // Resposta idêntica com ou sem conta: a tela não pode revelar se o e-mail existe
  async requestRecovery(email: string): Promise<PasswordMessageResponse> {
    if (!USE_REAL_API) return mockDelay(() => ({ message: RECOVERY_MESSAGE }));
    return postJson(RECOVER_URL, { email });
  },

  async resetPassword(token: string, newPassword: string): Promise<PasswordMessageResponse> {
    if (!USE_REAL_API) {
      return mockDelay(() => {
        if (!token || MOCK_INVALID_TOKENS.includes(token)) throw { status: 400, message: INVALID_TOKEN_MESSAGE };
        return { message: RESET_SUCCESS_MESSAGE };
      });
    }
    return postJson(RESET_URL, { token, newPassword });
  },
};
