import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { photoRosterService } from "@/services/photoRosterService";
import {
  ALICE,
  BACKEND_FORBIDDEN_TEXT,
  BRUNO,
  errorBody,
  FORBIDDEN_MESSAGE,
  jsonResponse,
  noContent,
  NOT_IN_ROOM_TEXT,
  removeRoute,
  ROOM_ID,
  STORED_TOKEN,
  STUDENTS_ROUTE,
  TUTOR,
} from "../fixtures";

// Camada de SERVICE: só fala HTTP. A fronteira simulada é o fetch global; o authFetch (Bearer) roda de verdade,
// como no roomService da US03.

function calls() {
  return vi.mocked(fetch).mock.calls.map(([url, init]) => ({ url: String(url), init: init ?? {} }));
}

describe("[US24] photoRosterService.removeStudentFromRoom", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("token", STORED_TOKEN);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("Deve remover o vínculo com um único DELETE autenticado na rota da sala, sem corpo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(noContent()).mockResolvedValueOnce(jsonResponse([TUTOR, BRUNO], 200));

    await photoRosterService.removeStudentFromRoom(ROOM_ID, ALICE.id);

    const deletes = calls().filter(({ init }) => init.method === "DELETE");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].url).toMatch(removeRoute(ALICE.id));
    // Caminho relativo: passa pelo rewrite /api/* do Next
    expect(deletes[0].url.startsWith("/")).toBe(true);
    expect(new Headers(deletes[0].init.headers).get("Authorization")).toBe(`Bearer ${STORED_TOKEN}`);
    expect(deletes[0].init.body ?? null).toBeNull();
  });

  it("Integridade do histórico: a única escrita é a do vínculo (nada de excluir usuário, notas ou feedbacks)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(noContent()).mockResolvedValueOnce(jsonResponse([TUTOR, BRUNO], 200));

    await photoRosterService.removeStudentFromRoom(ROOM_ID, ALICE.id);

    const writes = calls().filter(({ init }) => (init.method ?? "GET") !== "GET");
    expect(writes.map(({ url }) => url)).toEqual([expect.stringMatching(removeRoute(ALICE.id))]);
  });

  it("Deve aceitar o 204 sem corpo e devolver a lista atualizada pelo backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(noContent()).mockResolvedValueOnce(jsonResponse([TUTOR, BRUNO], 200));

    await expect(photoRosterService.removeStudentFromRoom(ROOM_ID, ALICE.id)).resolves.toEqual([TUTOR, BRUNO]);

    // A lista vem do backend depois da confirmação, e não de um filtro local
    const [first, second] = calls();
    expect(first.init.method).toBe("DELETE");
    expect(second.url).toMatch(STUDENTS_ROUTE);
    expect(second.init.method ?? "GET").toBe("GET");
  });

  // --- 403: QUEM NÃO É O TUTOR ---

  it("Deve rejeitar o 403 com mensagem em português dizendo que só o tutor remove (o backend manda texto em inglês)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(errorBody(403, BACKEND_FORBIDDEN_TEXT), 403));

    const error = await photoRosterService.removeStudentFromRoom(ROOM_ID, ALICE.id).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(FORBIDDEN_MESSAGE);
    expect((error as Error).message).not.toBe(BACKEND_FORBIDDEN_TEXT);
  });

  it("Não deve recarregar a lista quando a remoção é recusada", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(errorBody(403, BACKEND_FORBIDDEN_TEXT), 403));

    await photoRosterService.removeStudentFromRoom(ROOM_ID, ALICE.id).catch(() => undefined);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  // --- 400: ALUNO FORA DA SALA ---

  it("Deve rejeitar o 400 com a mensagem do backend (aluno que não está na sala)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(errorBody(400, NOT_IN_ROOM_TEXT), 400));

    await expect(photoRosterService.removeStudentFromRoom(ROOM_ID, ALICE.id)).rejects.toThrow(NOT_IN_ROOM_TEXT);
  });

  it("Deve rejeitar com mensagem não vazia quando o backend responde sem corpo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 500 }));

    const error = await photoRosterService.removeStudentFromRoom(ROOM_ID, ALICE.id).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message.trim()).not.toBe("");
  });
});
