import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ATTENDANCE_TIMEOUT_MS, attendanceService } from "@/services/attendanceService";
import type { AttendanceStatus } from "@/types/attendance";
import {
  ALL_STATUSES,
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  makeAttendance,
  SESSION_ID,
  STUDENT_ID,
  TIMEOUT_MESSAGE,
} from "../fixtures";

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

afterEach(() => {
  vi.useRealTimers();
});

describe("[US09] attendanceService", () => {
  // %s no lugar de $status: strings em $var saem entre aspas no título
  it.each(ALL_STATUSES)("Deve fazer PUT apenas do status %s na rota do aluno na sessão e devolver o registro do servidor", async (status: AttendanceStatus) => {
    const saved = makeAttendance({ status });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(saved, 200));

    await expect(attendanceService.registerAttendance(SESSION_ID, STUDENT_ID, status)).resolves.toEqual(saved);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/sessions/${SESSION_ID}/attendances/${STUDENT_ID}$`));
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    // O horário é do servidor: o corpo leva só o status
    expect(sentBody(init)).toEqual({ status });
  });

  it("Deve rejeitar com o status e a mensagem em texto puro quando o backend recusa com 403", async () => {
    // O 403 do GlobalExceptionHandler não é JSON
    vi.mocked(fetch).mockResolvedValue(
      new Response(FORBIDDEN_TEXT, {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    await expect(attendanceService.registerAttendance(SESSION_ID, STUDENT_ID, "ABSENT"))
      .rejects.toEqual({ status: 403, message: expect.stringMatching(FORBIDDEN_MESSAGE) });
    singleFetchCall();
  });

  it("[QA] Deve abortar a requisição e rejeitar com a mensagem de timeout quando o servidor não responde em 8 segundos", async () => {
    vi.useFakeTimers();
    // Rede lenta: a resposta nunca chega, a promessa só termina se o sinal for abortado
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    const request = attendanceService.registerAttendance(SESSION_ID, STUDENT_ID, "PRESENT");
    // Registrada antes de avançar o relógio, para a rejeição não ficar sem tratamento
    const outcome = expect(request).rejects.toEqual({ status: 0, message: expect.stringMatching(TIMEOUT_MESSAGE) });

    const { init } = singleFetchCall();
    expect(ATTENDANCE_TIMEOUT_MS).toBe(8000);

    await vi.advanceTimersByTimeAsync(ATTENDANCE_TIMEOUT_MS - 1);
    expect(init.signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(init.signal?.aborted).toBe(true);
    await outcome;
  });
});
