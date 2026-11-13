import { vi } from "vitest";

// Fixtures da US23 — Edição de perfil do usuário.
//
// Objetivo da US: o usuário logado altera o nome, a foto de perfil (JPG/PNG de até 5MB, com preview instantâneo e
// loading visual durante o envio) e a senha, sendo esta última protegida pela confirmação da senha atual.
// QA: cobrir o erro de senha atual incorreta e o payload acima de 5MB em todas as camadas.
//
// TDD: estes testes são escritos antes do código e fixam o contrato abaixo, camada por camada.
//
//  0. UTIL (regra de domínio, pura) — src/utils/profilePhoto.ts
//     MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024 (exatamente 5MB é aceito, como no backend)
//     validateProfilePhoto(file) -> null quando válida | mensagem de erro (tamanho ou formato)
//
//  1. SERVICE (HTTP) — src/services/profileService.ts
//     Rotas protegidas do UserProfileController; usa o authFetch (Bearer + caminho relativo /api/v1, que o Next
//     reescreve para o backend), como o roomService:
//       updateProfile({ name, photo })   -> PUT /api/v1/users/me/profile, multipart no mesmo formato do cadastro (US01):
//                                           parte "data" (Blob application/json com { name }) + parte "photo" opcional.
//                                           Sem Content-Type manual (o navegador gera o boundary). Sem id/e-mail no corpo:
//                                           o backend identifica o usuário pelo token.
//       changePassword({ currentPassword, newPassword }) -> PUT /api/v1/users/me/password (JSON)
//     Sucesso devolve o corpo (UserResponse | { message }); erro rejeita com { status, message, fieldErrors? }
//     (status 0 = sem resposta do servidor), no padrão da US21/US22.
//
//  2. HOOKS (estado + sessão + navegação)
//     src/hooks/useEditProfile.ts   -> { profile, saveProfile({ name, photo }), isSaving, successMessage, error }
//        profile inicial = usuário salvo pelo login (localStorage "user"); após salvar, atualiza profile e o "user".
//     src/hooks/useChangePassword.ts -> { changePassword(current, next), isSubmitting, successMessage, error }
//        A troca incrementa o tokenVersion no backend e REVOGA o token atual: após o sucesso o hook encerra a
//        sessão (remove "token" e "user") e leva ao login ("/"), podendo aguardar até MAX_REDIRECT_DELAY_MS.
//
//     Sessão revogada: os dois hooks tratam 401 do backend (token antigo após troca de senha em outro lugar)
//     encerrando a sessão e levando ao login — o authFetch, ao contrário do axios, não trata 401 sozinho.
//
//  3. COMPONENTES (UI) — src/components/features/profile/
//     ProfilePhotoUpload: input de arquivo, preview instantâneo (URL.createObjectURL) e o ÚNICO loading visual
//       da edição (role=progressbar). Arquivo inválido (> 5MB ou fora de JPG/PNG) é recusado na hora: alerta,
//       sem preview, e a seleção é descartada (onChange(null)). Salvar em seguida envia só o nome, sem foto.
//     ProfileForm: <form aria-label="Dados do perfil"> nome + e-mail só leitura + ProfilePhotoUpload + "Salvar"
//     ChangePasswordForm: <form aria-label="Alterar senha"> "Senha atual" + "Nova senha" + "Alterar senha"
//     ProfilePanel: container; liga os dois hooks aos dois formulários.
//     A página src/app/profile/page.tsx só renderiza o Panel (rota /profile, conforme o card da US).
//
// COMBINAR COM O BACK-END (achados ao ler o código e os testes de backend da US23 no main):
//  - application.properties não define spring.servlet.multipart.max-file-size/max-request-size: vale o padrão do
//    Spring (1MB), e uma foto válida de 2MB volta 400 "File exceeds maximum upload limit of 5MB".
//  - A foto é servida pelo backend em /fotosPerfil/** (URL relativa ao backend). O Next só reescreve /api/*:
//    o front precisa de um rewrite para /fotosPerfil/:path* (ou montar a URL do backend) para a imagem carregar.
//  - Os testes Selenium do backend usam a rota /perfil e a porta 5173; o card da US define /profile e o front é Next.
//  - O UserProfileController precisa resolver o usuário pelo Principal (não por Jwt) para funcionar também no
//    perfil e2e, que autentica pelo header X-User-Id.

// Rotas completas, como saem do front (caminho relativo reescrito pelo Next)
export const PROFILE_ROUTE = /\/api\/v1\/users\/me\/profile$/;
export const PASSWORD_ROUTE = /\/api\/v1\/users\/me\/password$/;
export const LOGIN_PAGE = "/";
export const MAX_REDIRECT_DELAY_MS = 3000;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const STORED_TOKEN = "jwt-usuario-perfil";
export const STORED_USER = {
  id: "usr_23",
  name: "Marina Silva",
  email: "marina@uefs.br",
  profilePictureUrl: "/fotosPerfil/atual.png",
};
export const NEW_NAME = "Marina Santos Atualizada";
export const NEW_PHOTO_URL = "/fotosPerfil/nova_foto.png";

export const CURRENT_PASSWORD = "SenhaAtual@2026";
export const NEW_PASSWORD = "NovaSenha@2027";
export const WRONG_PASSWORD = "SenhaErrada@0000";

// Textos do backend (UserProfileController/Service da US23); o front repassa exatamente o que recebe
export const WRONG_CURRENT_PASSWORD_TEXT = "Senha atual incorreta.";
export const PASSWORD_CHANGED_TEXT = "Senha alterada com sucesso.";
export const BACKEND_FILE_TOO_LARGE_TEXT = "File exceeds maximum upload limit of 5MB";
export const NAME_REQUIRED_TEXT = "O nome é obrigatório";

// Textos do front
export const PROFILE_SAVED_MESSAGE = /perfil atualizado/i;
// Mesmo texto que o cadastro (useRegistration, US01) já usa para o limite de 5MB
export const PHOTO_TOO_LARGE_MESSAGE = /excede o limite de 5\s?MB/i;
export const PHOTO_INVALID_TYPE_MESSAGE = /jpg ou png/i;
// Qualquer mensagem que cite o limite (tradução do texto do backend ou o próprio texto)
export const SIZE_LIMIT_MESSAGE = /5\s?MB/i;

export function makePhoto(bytes: number, name = "perfil.png", type = "image/png"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

export const validPhoto = () => makePhoto(50 * 1024, "perfil.jpg", "image/jpeg");
export const exactLimitPhoto = () => makePhoto(MAX_PHOTO_BYTES, "limite.png", "image/png");
export const oversizedPhoto = () => makePhoto(MAX_PHOTO_BYTES + 1, "gigante.jpg", "image/jpeg");
export const pdfFile = () => makePhoto(1024, "documento.pdf", "application/pdf");
export const gifFile = () => makePhoto(1024, "animacao.gif", "image/gif");

// Respostas do backend
export const makeUserResponse = (overrides: Partial<typeof STORED_USER> = {}) => ({
  ...STORED_USER,
  name: NEW_NAME,
  profilePictureUrl: NEW_PHOTO_URL,
  ...overrides,
});

export function errorBody(status: number, message: string, extra: Record<string, unknown> = {}) {
  return { timestamp: "2026-11-13T10:00:00", status, error: "Bad Request", message, ...extra };
}

export const makeWrongPasswordBody = () => errorBody(400, WRONG_CURRENT_PASSWORD_TEXT);
export const makeFileTooLargeBody = () => errorBody(400, BACKEND_FILE_TOO_LARGE_TEXT);
export const makeValidationBody = () => errorBody(400, "Validation failed", { errors: { name: NAME_REQUIRED_TEXT } });

// Contrato de erro do service (o que os hooks recebem)
export const makeWrongPasswordError = () => ({ status: 400, message: WRONG_CURRENT_PASSWORD_TEXT });
export const makeFileTooLargeError = () => ({ status: 400, message: BACKEND_FILE_TOO_LARGE_TEXT });
// Token revogado (tokenVersion defasado) ou expirado
export const makeUnauthorizedError = () => ({ status: 401, message: "Sessão expirada." });

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export function storeSession(user = STORED_USER, token = STORED_TOKEN) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function storedUser(): Record<string, unknown> | null {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

// Lê um Blob/File do FormData sem depender de Blob.text() (nem todas as versões do jsdom têm)
export function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

// O jsdom não implementa URL.createObjectURL: o preview instantâneo precisa dele
export function stubObjectUrls() {
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let counter = 0;
  const create = vi.fn(() => `blob:preview-${++counter}`);
  const revoke = vi.fn();
  URL.createObjectURL = create as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = revoke as unknown as typeof URL.revokeObjectURL;
  return {
    create,
    revoke,
    restore: () => {
      URL.createObjectURL = original.create;
      URL.revokeObjectURL = original.revoke;
    },
  };
}
