import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionRoleService } from "@/services/sessionRoleService";
import type { SessionRole } from "@/types/sessionRole";
import {
  ALL_ROLES,
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  makeAssignment,
  OTHER_STUDENT_ID,
  ROLE_TAKEN_MESSAGE,
  ROLE_TAKEN_TEXT,
  SESSION_ID,
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

describe("[US10] sessionRoleService", () => {
  // %s no lugar de $role: strings em $var saem entre aspas no título
  it.each(ALL_ROLES)("Deve fazer PUT do aluno e da nota extra na rota do papel %s na sessão e devolver a atribuição do servidor", async (role: SessionRole) => {
    const saved = makeAssignment({ studentId: OTHER_STUDENT_ID, studentName: "Bruno Lima", role, extraGrade: 0.5 });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(saved, 201));

    await expect(sessionRoleService.assignRole(SESSION_ID, role, OTHER_STUDENT_ID, 0.5)).resolves.toEqual(saved);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/sessions/${SESSION_ID}/roles/${role}$`));
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    // O papel vai na URL: o corpo leva só o aluno e a nota, com a nota como número
    expect(sentBody(init)).toEqual({ studentId: OTHER_STUDENT_ID, extraGrade: 0.5 });
  });

  it("[QA] Deve rejeitar com o status 422 e a mensagem do backend quando o papel já está com outro aluno", async () => {
    // A regra "um aluno por papel" vive no backend; o cliente só propaga o 422 com a mensagem para a interface
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ status: 422, error: "Unprocessable Content", message: ROLE_TAKEN_TEXT }, 422),
    );

    await expect(sessionRoleService.assignRole(SESSION_ID, "BOARD_SECRETARY", OTHER_STUDENT_ID, 0.5))
      .rejects.toEqual({ status: 422, message: expect.stringMatching(ROLE_TAKEN_MESSAGE) });
    singleFetchCall();
  });

  it("Deve rejeitar com o status e a mensagem em texto puro quando o backend recusa com 403", async () => {
    // O 403 do GlobalExceptionHandler não é JSON
    vi.mocked(fetch).mockResolvedValue(
      new Response(FORBIDDEN_TEXT, {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    await expect(sessionRoleService.assignRole(SESSION_ID, "COORDINATOR", OTHER_STUDENT_ID, 1))
      .rejects.toEqual({ status: 403, message: expect.stringMatching(FORBIDDEN_MESSAGE) });
    singleFetchCall();
  });
});
