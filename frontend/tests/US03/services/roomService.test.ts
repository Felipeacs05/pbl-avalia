import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { roomService } from "@/services/roomService";
import { makeOtherRoom, makeRoom, ROOM_ID } from "../fixtures";

function jsonResponse(body: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function singleFetchCall() {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init ?? {} };
}

function sentBody(init: RequestInit): unknown {
  return JSON.parse(String(init.body));
}

describe("[US03] roomService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Deve buscar todas as salas via GET /api/v1/rooms no caminho de API real", async () => {
    const expectedRooms = [makeRoom(), makeOtherRoom()];
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(expectedRooms, 200));

    const result = await roomService.fetchRooms();

    const { url, init } = singleFetchCall();
    expect(url).toBe("/api/v1/rooms");
    expect(init.method).toBe("GET");
    expect(result).toEqual(expectedRooms);
  });

  it("Deve criar uma nova sala via POST /api/v1/rooms com o nome e devolver o código e link gerados", async () => {
    const createdPayload = { code: "ABC123", joinLink: "app/join/ABC123" };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(createdPayload, 201));

    const result = await roomService.createRoom("Sistemas Operacionais");

    const { url, init } = singleFetchCall();
    expect(url).toBe("/api/v1/rooms");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ name: "Sistemas Operacionais" });
    expect(result).toEqual(createdPayload);
  });

  it("Deve atualizar o nome da sala via PUT /api/v1/rooms/{id}", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    await roomService.updateRoom(ROOM_ID, "Nome Novo");

    const { url, init } = singleFetchCall();
    expect(url).toBe(`/api/v1/rooms/${ROOM_ID}`);
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ name: "Nome Novo" });
  });

  it("Deve excluir a sala via DELETE /api/v1/rooms/{id}", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    await roomService.deleteRoom(ROOM_ID);

    const { url, init } = singleFetchCall();
    expect(url).toBe(`/api/v1/rooms/${ROOM_ID}`);
    expect(init.method).toBe("DELETE");
  });
});
