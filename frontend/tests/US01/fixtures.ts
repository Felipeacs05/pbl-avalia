import type { RegistrationData } from "@/types/registration";

// UUIDs fixos para cenários de teste da US01 conforme convenção do projeto
export const USER_ID = "111e1111-e11b-11d1-a111-111111111111";
export const REGISTERED_USER_ID = "222e2222-e22b-22d2-a222-222222222222";

// Mensagens literais e expressões regulares para validação de feedback visual e toast
export const REQUIRED_FIELDS_TEXT = "Preencha todos os campos obrigatórios.";
export const REQUIRED_FIELDS_MESSAGE = /preencha todos os campos obrigatórios/i;

export const PASSWORD_MISMATCH_TEXT = "As senhas não coincidem.";
export const PASSWORD_MISMATCH_MESSAGE = /as senhas não coincidem/i;

export const IMAGE_SIZE_LIMIT_TEXT = "A imagem selecionada excede o limite de 5MB.";
export const IMAGE_SIZE_LIMIT_MESSAGE = /a imagem selecionada excede o limite de 5mb/i;

export const SUCCESS_TEXT = "Conta criada com sucesso! Redirecionando...";
export const SUCCESS_MESSAGE = /conta criada com sucesso! redirecionando\.\.\./i;

export const DEFAULT_ERROR_TEXT = "Falha ao realizar o cadastro. Tente novamente.";
export const DEFAULT_ERROR_MESSAGE = /falha ao realizar o cadastro\. tente novamente\./i;

export const API_ERROR_TEXT = "E-mail já cadastrado no sistema.";
export const API_ERROR_MESSAGE = /e-mail já cadastrado no sistema/i;

export const IMAGE_SUCCESS_TEXT = "✓ Imagem selecionada com sucesso";
export const IMAGE_SUCCESS_MESSAGE = /imagem selecionada com sucesso/i;

// Rótulos e textos estáticos de botões e links
export const SUBMIT_BUTTON_TEXT = "Cadastrar";
export const SUBMIT_BUTTON_LOADING_TEXT = "Criando conta...";
export const LOGIN_LINK_TEXT = "Faça login";

// Limites de tamanho de arquivo em bytes (5MB = 5 * 1024 * 1024 = 5.242.880 bytes)
export const FIVE_MB = 5 * 1024 * 1024;
export const FIVE_MB_PLUS_ONE = FIVE_MB + 1;

// Payloads para testes de sanitização e segurança
export const XSS_NAME_PAYLOAD = "<script>alert(1)</script>";
export const SQLI_EMAIL_PAYLOAD = "admin' OR '1'='1";

/**
 * Cria um objeto de dados de cadastro com valores padrão válidos e opcionais customizáveis.
 */
export function makeRegistrationData(overrides: Partial<RegistrationData> = {}): RegistrationData {
  return {
    name: "João da Silva",
    email: "joao.silva@uefs.br",
    password: "Password@123",
    image: null,
    ...overrides,
  };
}

/**
 * Cria uma instância de File em memória simulando upload de imagem com tamanho e tipo controlados.
 */
export function makeImageFile(
  size: number = 1024,
  type: "image/png" | "image/jpeg" = "image/png",
  name: string = "avatar.png",
): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

/**
 * Cria a estrutura de erro retornada por chamadas de API axios-like.
 */
export const makeApiError = (message: string = API_ERROR_TEXT, status: number = 400) => ({
  status,
  response: {
    status,
    data: {
      message,
    },
  },
});
