// src/utils/profilePhoto.ts
// Regra da foto de perfil (US23): JPG ou PNG de até 5MB, a mesma fronteira do backend

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export const PHOTO_TOO_LARGE_MESSAGE = "A imagem selecionada excede o limite de 5MB.";
export const PHOTO_INVALID_TYPE_MESSAGE = "Formato inválido. Envie uma imagem JPG ou PNG.";

/** null quando a foto é válida; caso contrário, a mensagem de erro. */
export function validateProfilePhoto(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return PHOTO_INVALID_TYPE_MESSAGE;
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return PHOTO_TOO_LARGE_MESSAGE;
  return null;
}
