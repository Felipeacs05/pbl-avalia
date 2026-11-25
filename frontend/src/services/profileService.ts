// src/services/profileService.ts
// Edição de perfil (US23). Erros no contrato { status, message, fieldErrors? }; status 0 = sem resposta (rede).
import type {
  ChangePasswordRequest,
  ProfileMessageResponse,
  UpdateProfileRequest,
  UserProfile,
} from "../types/profile";
import { USE_REAL_API } from "./apiMode";
import { authFetch } from "./authFetch";
import { PHOTO_TOO_LARGE_MESSAGE } from "../utils/profilePhoto";

// COMBINAR COM O BACK-END (endpoints do UserProfileController):
//  - Rotas protegidas abaixo, por caminho relativo (o next.config.ts reescreve /api/* para o BACKEND_URL).
//    Se o backend mudar a rota, troque só estas duas constantes (e os testes da US23, que fixam a rota).
//  - PUT perfil: multipart com a parte "data" (JSON { name }) + parte "photo" opcional, igual ao cadastro (US01).
//    O usuário é identificado pelo token: não vai id nem e-mail no corpo.
//  - PUT senha: JSON { currentPassword, newPassword }. A troca revoga o token atual (tokenVersion).
//  - O Spring precisa de spring.servlet.multipart.max-file-size=5MB e max-request-size=5MB
//    (sem isso o padrão é 1MB e uma foto válida de 2MB é recusada).
//  - A foto é servida em /fotosPerfil/** pelo backend: o next.config.ts tem um rewrite para essa pasta.
//  - Para sair do mock, rode com NEXT_PUBLIC_USE_MOCKS=false.
const PROFILE_URL = "/api/v1/users/me/profile";
const PASSWORD_URL = "/api/v1/users/me/password";

const DEFAULT_ERROR_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";
const NETWORK_ERROR_MESSAGE = "Sem conexão com o servidor. Tente novamente.";
const SESSION_EXPIRED_MESSAGE = "Sua sessão expirou. Entre novamente.";

// Modo mock: esta senha atual simula o erro de senha incorreta; qualquer outra é aceita
const MOCK_WRONG_PASSWORD = "errada";

async function send<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await authFetch(url, init);
  } catch {
    throw { status: 0, message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const fieldErrors: Record<string, string> | undefined = data?.errors ?? undefined;
    let message: string = data?.message || data?.error || "";
    if (/maximum upload limit/i.test(message)) message = PHOTO_TOO_LARGE_MESSAGE;
    if (fieldErrors && Object.keys(fieldErrors).length > 0) message = Object.values(fieldErrors)[0];
    if (!message.trim()) message = response.status === 401 ? SESSION_EXPIRED_MESSAGE : DEFAULT_ERROR_MESSAGE;
    throw fieldErrors ? { status: response.status, message, fieldErrors } : { status: response.status, message };
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

function mockStoredUser(): UserProfile {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "{}");
  } catch {
    return { name: "", email: "" };
  }
}

export const profileService = {
  async updateProfile({ name, photo }: UpdateProfileRequest): Promise<UserProfile> {
    if (!USE_REAL_API) {
      return mockDelay(() => ({
        ...mockStoredUser(),
        name,
        // No mock a foto só vale enquanto a aba estiver aberta
        ...(photo ? { profilePictureUrl: URL.createObjectURL(photo) } : {}),
      }));
    }
    const form = new FormData();
    form.append("data", new Blob([JSON.stringify({ name })], { type: "application/json" }));
    if (photo) form.append("photo", photo);
    // Sem Content-Type manual: o navegador gera o boundary do multipart
    return send<UserProfile>(PROFILE_URL, { method: "PUT", body: form });
  },

  async changePassword({ currentPassword, newPassword }: ChangePasswordRequest): Promise<ProfileMessageResponse> {
    if (!USE_REAL_API) {
      return mockDelay(() => {
        if (currentPassword === MOCK_WRONG_PASSWORD) throw { status: 400, message: "Senha atual incorreta." };
        return { message: "Senha alterada com sucesso." };
      });
    }
    return send<ProfileMessageResponse>(PASSWORD_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};
