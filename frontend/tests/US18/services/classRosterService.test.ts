import { beforeEach, describe, expect, it, vi } from "vitest";
import { classRosterService } from "@/services/classRosterService";
import {
  makeRosterPage,
  makeRosterStudent,
  makeStudentWithoutPhoto,
  makeThirdStudent,
  ROOM_ID,
  ROSTER_PAGE_SIZE,
} from "../fixtures";

const ROOM_ROSTER_PATH = `/api/v1/rooms/${ROOM_ID}/roster`;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// A URL pode ser relativa: a base só serve para ler o caminho e os parâmetros
function fetchCalls() {
  return vi.mocked(fetch).mock.calls.map(([url, init]) => {
    const parsed = new URL(String(url), "http://localhost");
    return {
      path: parsed.pathname,
      page: parsed.searchParams.get("page"),
      size: parsed.searchParams.get("size"),
      init: init ?? {},
    };
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("[US18] classRosterService", () => {
  it("Deve buscar com GET o carômetro da sala e devolver os alunos com foto e iniciais, como vieram do backend", async () => {
    const students = [makeRosterStudent(), makeStudentWithoutPhoto()];
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makeRosterPage(students), 200));

    // A URL nula e as iniciais chegam intactas: é com elas que o avatar reserva é montado
    await expect(classRosterService.fetchClassRoster(ROOM_ID)).resolves.toEqual(students);

    const calls = fetchCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0].path).toMatch(new RegExp(`${ROOM_ROSTER_PATH}$`));
    expect(calls[0].page).toBe("0");
    expect(calls[0].size).toBe(String(ROSTER_PAGE_SIZE));
    expect(calls[0].init.method ?? "GET").toBe("GET");
    expect(calls[0].init.body).toBeUndefined();
  });

  it("Deve buscar as páginas seguintes até totalPages e devolver todos os alunos na ordem do backend", async () => {
    const firstPage = [makeRosterStudent(), makeStudentWithoutPhoto()];
    const secondPage = [makeThirdStudent()];
    const totals = { totalElements: 3, totalPages: 2 };
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(makeRosterPage(firstPage, totals), 200))
      .mockResolvedValueOnce(jsonResponse(makeRosterPage(secondPage, { page: 1, ...totals }), 200));

    // A grade precisa mostrar todos os alunos da sala, não só a primeira página
    await expect(classRosterService.fetchClassRoster(ROOM_ID))
      .resolves.toEqual([...firstPage, ...secondPage]);

    const calls = fetchCalls();
    expect(calls.map((call) => call.page)).toEqual(["0", "1"]);
    expect(calls.every((call) => call.path.endsWith(ROOM_ROSTER_PATH))).toBe(true);
    expect(calls.every((call) => call.size === String(ROSTER_PAGE_SIZE))).toBe(true);
  });
});
