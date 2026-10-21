// src/services/sessionRoleService.ts

// atribui um papel da sessão a um aluno.
// Contrato do backend: PUT /api/v1/sessions/{sessionId}/roles/{role}
//   corpo:    { studentId, extraGrade }  (o papel vai na URL)
//   201:      SessionRoleAssignment
//   422:      JSON { message } quando o papel já está com outro aluno
//   403:      texto puro quando quem chama não é o tutor da sala
import type {
  SessionRole,
  SessionRoleAssignment,
  SessionRoleRequestError,
} from "../types/sessionRole";
import { sessionRoleMock } from "../mocks/sessionRole.mock";
import { USE_REAL_API } from "./apiMode";

const BASE_URL = "/api/v1/sessions";

// Mesmo padrão dos outros serviços: fora dos testes usa o mock.
// Quando o endpoint estiver no ar, basta remover o desvio para o mock em assignRole.
const USE_MOCKS = !USE_REAL_API;

const NETWORK_MESSAGE = "Não foi possível atribuir o papel. Verifique sua conexão e tente novamente.";
const GENERIC_MESSAGE = "Não foi possível atribuir o papel. Tente novamente.";

/** O backend responde o 403 em texto puro e os outros erros em JSON ({ message }). */
async function toRequestError(response: Response): Promise<SessionRoleRequestError> {
  const text = (await response.text()).trim();
  let message = text;
  try {
    const body: unknown = JSON.parse(text);
    if (typeof body === "object" && body !== null && "message" in body) {
      message = String((body as { message: unknown }).message);
    }
  } catch {
    // corpo não é JSON: mantém o texto puro
  }
  return { status: response.status, message: message || GENERIC_MESSAGE };
}

export const sessionRoleService = {
  /** Rejeita com { status, message }; status 0 indica falha de rede. */
  async assignRole(
    sessionId: string,
    role: SessionRole,
    studentId: string,
    extraGrade: number,
  ): Promise<SessionRoleAssignment> {
    if (USE_MOCKS) return sessionRoleMock.assignRole(sessionId, role, studentId, extraGrade);

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/${sessionId}/roles/${role}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, extraGrade }),
      });
    } catch {
      throw { status: 0, message: NETWORK_MESSAGE } satisfies SessionRoleRequestError;
    }

    if (!response.ok) throw await toRequestError(response);
    return (await response.json()) as SessionRoleAssignment;
  },

  /**
   * Tira o papel da sessão ("Sem papel específico").
   * a US10 ainda não tem rota de remoção. Deixei preparado como
   * DELETE /api/v1/sessions/{sessionId}/roles/{role}
   */
  async removeRole(sessionId: string, role: SessionRole): Promise<void> {
    if (USE_MOCKS) return sessionRoleMock.removeRole(sessionId, role);

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/${sessionId}/roles/${role}`, { method: "DELETE" });
    } catch {
      throw { status: 0, message: NETWORK_MESSAGE } satisfies SessionRoleRequestError;
    }
    if (!response.ok) throw await toRequestError(response);
  },
};
