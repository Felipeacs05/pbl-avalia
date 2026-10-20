import { beforeEach, describe, expect, it, vi } from "vitest";
import { roomService } from "@/services/roomService";
import { makeRoom, ROOM_ID } from "../fixtures";

function jsonResponse(body: unknown, status: number): Response {
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

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("[US03] roomService", () => {
  it("fetchRooms should GET /api/v1/rooms and return the user's rooms", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([makeRoom()], 200));

    const rooms = await roomService.fetchRooms();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(/\/api\/v1\/rooms$/);
    expect(init.method ?? "GET").toBe("GET");
    expect(rooms).toEqual([makeRoom()]);
  });

  it("createRoom should POST only the name and return the generated code and join link", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ code: "A1B2C", joinLink: "app/join/A1B2C" }, 201));

    const created = await roomService.createRoom("Software Engineering Module");

    const { url, init } = singleFetchCall();
    expect(url).toMatch(/\/api\/v1\/rooms$/);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ name: "Software Engineering Module" });
    expect(created).toEqual({ code: "A1B2C", joinLink: "app/join/A1B2C" });
  });

  it("updateRoom should PUT the new name to the room's route", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ code: "A1B2C", joinLink: "app/join/A1B2C" }, 200));

    await expect(roomService.updateRoom(ROOM_ID, "Updated Module")).resolves.toBeUndefined();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}$`));
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ name: "Updated Module" });
  });

  it("deleteRoom should DELETE the room's route and resolve on 204", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(roomService.deleteRoom(ROOM_ID)).resolves.toBeUndefined();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}$`));
    expect(init.method).toBe("DELETE");
  });
});
