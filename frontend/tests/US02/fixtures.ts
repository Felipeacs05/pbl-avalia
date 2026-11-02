import type { LoginCredentials } from "@/types/login";
import type { AuthResponse } from "@/types/auth";
import { authMockSuccess } from "@/mocks/auth.mock";

// Identificadores fixos para cenários de teste da US02
export const USER_ID = "usr_01";
export const OTHER_USER_ID = "usr_02";
export const ROOM_ID = "room_01";

// JWT com claims válidas (expiração futura e passada para teste de expiração)
export const VALID_JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMDEiLCJuYW1lIjoiTWFybHVzIFJpb3MiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTk5OTk5OTk5OX0.dummySignature";
export const EXPIRED_JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMDEiLCJuYW1lIjoiTWFybHVzIFJpb3MiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTAwMDAwMDAwMH0.dummySignature";

// Mensagens literais e expressões regulares
export const INVALID_CREDENTIALS_TEXT = "Credenciais inválidas.";
export const INVALID_CREDENTIALS_MESSAGE = /credenciais inválidas/i;

export const LEGACY_INVALID_CREDENTIALS_TEXT = "E-mail ou senha incorretos.";
export const LEGACY_INVALID_CREDENTIALS_MESSAGE = /e-mail ou senha incorretos/i;

export const DEFAULT_ERROR_TEXT = "Erro ao realizar login. Verifique seus dados de acesso.";
export const DEFAULT_ERROR_MESSAGE = /erro ao realizar login\. verifique seus dados de acesso\./i;

export const RATE_LIMIT_TEXT =
  "Muitas tentativas em pouco tempo. Seu acesso foi temporariamente bloqueado. Aguarde alguns minutos e tente novamente.";
export const RATE_LIMIT_MESSAGE = /muitas tentativas em pouco tempo/i;

// Textos de interface e botões
export const SUBMIT_BUTTON_TEXT = "Entrar";
export const SUBMIT_BUTTON_LOADING_TEXT = "Entrando...";
export const REGISTER_LINK_TEXT = "Cadastre-se";

// Títulos e cabeçalhos de dashboard
export const DASHBOARD_TITLE = "Avalia - Suas Salas";
export const TEACHER_TAB_LABEL = "Professor";
export const STUDENT_TAB_LABEL = "Aluno";
export const CREATE_ROOM_BUTTON_TEXT = "Criar nova sala";
export const ENTER_ROOM_BUTTON_TEXT = "Entrar em sala";

/**
 * Cria credenciais válidas com base no mock de autenticação.
 */
export function makeLoginCredentials(overrides: Partial<LoginCredentials> = {}): LoginCredentials {
  return {
    email: "marlus@uefs.br",
    password: "123456",
    ...overrides,
  };
}

/**
 * Cria credenciais incorretas para cenários de erro.
 */
export function makeInvalidCredentials(): LoginCredentials {
  return {
    email: "usuario.inexistente@uefs.br",
    password: "senhaIncorreta",
  };
}

/**
 * Cria resposta de autenticação mockada.
 */
export function makeAuthResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    ...authMockSuccess,
    ...overrides,
  };
}

/**
 * Cria resposta de erro simulada do axios.
 */
export function makeAxiosError(status: number, message: string) {
  return {
    response: {
      status,
      data: {
        message,
      },
    },
  };
}
