import { describe, expect, it } from "vitest";
import { MAX_PROFILE_PHOTO_BYTES, validateProfilePhoto } from "@/utils/profilePhoto";
import {
  exactLimitPhoto,
  gifFile,
  makePhoto,
  MAX_PHOTO_BYTES,
  oversizedPhoto,
  pdfFile,
  PHOTO_INVALID_TYPE_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  validPhoto,
} from "../fixtures";

// Regra de domínio pura: a mesma fronteira de 5MB e os mesmos formatos que o UserProfileService aceita
describe("[US23] validateProfilePhoto", () => {
  it("Deve fixar o limite em 5MB (5 * 1024 * 1024 bytes), igual ao backend", () => {
    expect(MAX_PROFILE_PHOTO_BYTES).toBe(MAX_PHOTO_BYTES);
  });

  // --- TAMANHO (payload acima de 5MB) ---

  it("Deve aceitar uma foto pequena em JPG", () => {
    expect(validateProfilePhoto(validPhoto())).toBeNull();
  });

  it("Fronteira: deve aceitar a foto com exatamente 5MB", () => {
    expect(validateProfilePhoto(exactLimitPhoto())).toBeNull();
  });

  it("Fronteira: deve recusar a foto com 5MB + 1 byte com mensagem que cita o limite", () => {
    expect(validateProfilePhoto(oversizedPhoto())).toMatch(PHOTO_TOO_LARGE_MESSAGE);
  });

  it("Deve recusar uma foto muito acima do limite (10MB)", () => {
    expect(validateProfilePhoto(makePhoto(10 * 1024 * 1024, "enorme.png", "image/png"))).toMatch(PHOTO_TOO_LARGE_MESSAGE);
  });

  // --- FORMATO ---

  it.each([
    ["image/jpeg", "foto.jpeg"],
    ["image/jpg", "foto.jpg"],
    ["image/png", "foto.png"],
  ])("Deve aceitar o formato %s", (type, name) => {
    expect(validateProfilePhoto(makePhoto(1024, name, type))).toBeNull();
  });

  it.each([
    ["PDF", pdfFile],
    ["GIF", gifFile],
    ["texto", () => makePhoto(10, "notas.txt", "text/plain")],
    ["sem tipo", () => makePhoto(10, "arquivo", "")],
  ])("Deve recusar arquivo %s com mensagem pedindo JPG ou PNG", (_case, build) => {
    expect(validateProfilePhoto(build())).toMatch(PHOTO_INVALID_TYPE_MESSAGE);
  });

  it("Deve recusar arquivo de formato inválido mesmo pequeno, sem confundir com erro de tamanho", () => {
    const message = validateProfilePhoto(pdfFile());

    expect(message).toMatch(PHOTO_INVALID_TYPE_MESSAGE);
    expect(message).not.toMatch(PHOTO_TOO_LARGE_MESSAGE);
  });
});
