import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch } from "@/services/authFetch";
import {
  jsonResponse,
  makeGenericForbiddenBody,
  makeNotVerifiedBody,
  mockWindowLocation,
  PENDING_USER_TOKEN,
  VERIFY_EMAIL_PAGE,
} from "../fixtures";

const STARTING_HREF = "http://localhost:3000/student-rooms";

describe("[US22] authFetch — interceptor de usuário pendente de verificação", () => {
  let restoreLocation: () => void;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", PENDING_USER_TOKEN);
    vi.stubGlobal("fetch", vi.fn());
    restoreLocation = mockWindowLocation(STARTING_HREF);
  });

  afterEach(() => {
    restoreLocation();
    localStorage.clear();
  });

  it("Deve redirecionar para /verify-email quando a resposta é 403 com o código de e-mail não verificado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeNotVerifiedBody(), 403));

    await authFetch("/api/v1/rooms", { method: "POST" });

    expect(window.location.href).toMatch(VERIFY_EMAIL_PAGE);
  });

  it("Deve devolver a resposta 403 com o corpo ainda legível para o service que chamou", async () => {
    // O interceptor lê o corpo para achar o código: precisa usar response.clone(),
    // senão o service (ex.: roomService.joinRoom) quebra ao chamar response.json()
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeNotVerifiedBody(), 403));

    const response = await authFetch("/api/v1/rooms/join", { method: "POST" });

    expect(response.status).toBe(403);
    expect(response.ok).toBe(false);
    await expect(response.json()).resolves.toEqual(makeNotVerifiedBody());
  });

  it("Não deve encerrar a sessão do usuário pendente", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeNotVerifiedBody(), 403));

    await authFetch("/api/v1/rooms", { method: "POST" });

    expect(localStorage.getItem("token")).toBe(PENDING_USER_TOKEN);
  });

  it("Não deve redirecionar em um 403 comum, sem o código de e-mail não verificado", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeGenericForbiddenBody(), 403));

    const response = await authFetch("/api/v1/rooms", { method: "POST" });

    expect(window.location.href).toBe(STARTING_HREF);
    await expect(response.json()).resolves.toEqual(makeGenericForbiddenBody());
  });

  it("Não deve redirecionar nem lançar erro em um 403 com corpo que não é JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));

    const response = await authFetch("/api/v1/rooms", { method: "POST" });

    expect(response.status).toBe(403);
    expect(window.location.href).toBe(STARTING_HREF);
  });

  it("Não deve redirecionar quando o usuário já está em /verify-email", async () => {
    restoreLocation();
    restoreLocation = mockWindowLocation("http://localhost:3000/verify-email");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(makeNotVerifiedBody(), 403));

    await authFetch("/api/v1/rooms", { method: "GET" });

    expect(window.location.href).toBe("http://localhost:3000/verify-email");
  });

  it("Não deve redirecionar quando a resposta é de sucesso e deve manter o corpo legível", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "1" }, 201));

    const response = await authFetch("/api/v1/rooms", { method: "POST" });

    expect(window.location.href).toBe(STARTING_HREF);
    await expect(response.json()).resolves.toEqual({ id: "1" });
  });
});
