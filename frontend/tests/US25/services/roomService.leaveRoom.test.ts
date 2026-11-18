import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { roomService } from "@/services/roomService";
import {
  ALREADY_LEFT_TEXT,
  errorBody,
  jsonResponse,
  LEAVE_ROUTE,
  noContent,
  NOT_A_MEMBER_TEXT,
  ROOM_ID,
  STORED_TOKEN,
  STUDENT,
  TUTOR_CANNOT_LEAVE_TEXT,
} from "../fixtures";

// Camada de SERVICE: só fala HTTP. A fronteira simulada é o fetch global; o authFetch (Bearer) roda de verdade,
// como no roomService da US03/US04.

type ServiceError = { status: number; message: string };

function calls() {
  return vi.mocked(fetch).mock.calls.map(([url, init]) => ({ url: String(url), init: init ?? {} }));
}

async function leaveError(): Promise<ServiceError> {
  return roomService.leaveRoom(ROOM_ID).then(
    () => {
      throw new Error("leaveRoom deveria ter rejeitado");
    },
    (error: unknown) => error as ServiceError,
  );
}

describe("[US25] roomService.leaveRoom", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", STORED_TOKEN);
    localStorage.setItem("user", JSON.stringify(STUDENT));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
  });

  // --- REQUISIÇÃO ---

  it("Deve sair da sala com um POST autenticado na rota /leave da sala, por caminho relativo (rewrite do Next)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(noContent());

    await roomService.leaveRoom(ROOM_ID);

    const [request] = calls();
    expect(request.url).toMatch(LEAVE_ROUTE);
    expect(request.url.startsWith("/api/v1/")).toBe(true);
    expect((request.init.method ?? "GET").toUpperCase()).toBe("POST");
    expect(new Headers(request.init.headers).get("Authorization")).toBe(`Bearer ${STORED_TOKEN}`);
  });

  it("Mantendo os dados do aluno: a única requisição é o /leave (nada de excluir sala, usuário, notas ou feedbacks)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(noContent());

    await roomService.leaveRoom(ROOM_ID);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(calls()[0].url).toMatch(LEAVE_ROUTE);
  });

  it("Não deve enviar o id do aluno: o backend identifica quem sai pelo token e ignora o corpo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(noContent());

    await roomService.leaveRoom(ROOM_ID);

    const { url, init } = calls()[0];
    const body = init.body == null ? "" : String(init.body);
    expect(body).not.toContain(STUDENT.id);
    expect(url).not.toContain(STUDENT.id);
  });

  // --- SUCESSO ---

  it("Deve aceitar o 204 sem corpo e resolver sem valor", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(noContent());

    await expect(roomService.leaveRoom(ROOM_ID)).resolves.toBeUndefined();
  });

  // --- ERROS DO BACKEND (status do RoomLeaveIntegrationTest) ---

  it("Deve rejeitar o 400 (tutor saindo da própria sala) com status e mensagem do backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(errorBody(400, TUTOR_CANNOT_LEAVE_TEXT), 400));

    await expect(leaveError()).resolves.toMatchObject({ status: 400, message: TUTOR_CANNOT_LEAVE_TEXT });
  });

  it("Deve rejeitar o 404 (aluno não vinculado) com status e mensagem do backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(errorBody(404, NOT_A_MEMBER_TEXT), 404));

    await expect(leaveError()).resolves.toMatchObject({ status: 404, message: NOT_A_MEMBER_TEXT });
  });

  it("Deve rejeitar o 409 (aluno que já saiu) com status e mensagem do backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(errorBody(409, ALREADY_LEFT_TEXT), 409));

    await expect(leaveError()).resolves.toMatchObject({ status: 409, message: ALREADY_LEFT_TEXT });
  });

  it("Deve rejeitar o 401 (sessão expirada) com status 401 e mensagem não vazia, mesmo sem corpo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));

    const error = await leaveError();

    expect(error.status).toBe(401);
    expect(String(error.message ?? "").trim()).not.toBe("");
  });

  it("Deve rejeitar o 500 (falha ao notificar o tutor, com rollback) com mensagem não vazia, mesmo sem JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));

    const error = await leaveError();

    expect(error.status).toBe(500);
    expect(String(error.message ?? "").trim()).not.toBe("");
  });

  it("Deve rejeitar com status 0 e mensagem não vazia quando não há resposta do servidor", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const error = await leaveError();

    expect(error.status).toBe(0);
    expect(String(error.message ?? "").trim()).not.toBe("");
  });
});
