import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendancePanel } from "@/components/features/attendance/AttendancePanel";
import type { Attendance, AttendanceStatus, SessionStudent } from "@/types/attendance";
import {
  ATTENDANCE_ID,
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  makeOtherStudent,
  makeStudent,
  OTHER_STUDENT_ID,
  PREVIOUS_RECORDED_AT,
  PREVIOUS_RECORDED_AT_LABEL,
  RECORDED_AT,
  RECORDED_AT_LABEL,
  SESSION_ID,
  STUDENT_ID,
  TIMEOUT_MESSAGE,
} from "../fixtures";

const ATTENDANCE_ROUTE = new RegExp(`/api/v1/sessions/${SESSION_ID}/attendances/([^/]+)$`);
const STUDENT_ROUTE = new RegExp(`/api/v1/sessions/${SESSION_ID}/attendances/${STUDENT_ID}$`);

// Estado do fakeBackend: um registro por aluno, como a chave única (sessão, aluno) do backend
let records: Map<string, Attendance>;
let requesterIsRoomTutor: boolean;
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Rede lenta: a resposta só sai quando o teste libera, e some se o cliente abortar
function throttled(init: RequestInit, respond: () => Response): Promise<Response> {
  return new Promise((resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    heldResponses.push(() => resolve(respond()));
  });
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const studentId = url.match(ATTENDANCE_ROUTE)?.[1];

  if (init.method !== "PUT" || !studentId) {
    return Promise.resolve(jsonResponse({}, 404));
  }
  const respond = () => {
    // Mesma regra do backend: só o tutor da sala registra a chamada; o 403 é texto puro
    if (!requesterIsRoomTutor) {
      return new Response(FORBIDDEN_TEXT, { status: 403 });
    }
    const { status } = JSON.parse(String(init.body)) as { status: AttendanceStatus };
    const existing = records.get(studentId);
    const student = [makeStudent(), makeOtherStudent()].find((s) => s.id === studentId)!;
    // O horário é do servidor; reenviar o mesmo status mantém o horário original
    const saved: Attendance = {
      id: existing?.id ?? `${ATTENDANCE_ID}-${studentId}`,
      sessionId: SESSION_ID,
      studentId,
      studentName: student.name,
      status,
      recordedAt: existing?.status === status ? existing.recordedAt : RECORDED_AT,
    };
    records.set(studentId, saved);
    return jsonResponse(saved, 200);
  };
  return networkIsSlow ? throttled(init, respond) : Promise.resolve(respond());
}

function requestsWithMethod(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined }));
}

function rowOf(name: string) {
  const item = screen.getAllByRole("listitem").find((li) => within(li).queryByText(name));
  if (!item) throw new Error(`linha do aluno ${name} não encontrada`);
  return item;
}

function statusButton(name: string, label: string) {
  return within(rowOf(name)).getByRole("button", { name: label });
}

async function releaseHeldResponses() {
  await act(async () => {
    heldResponses.splice(0).forEach((release) => release());
  });
}

function renderPanel(students: SessionStudent[] = [makeStudent(), makeOtherStudent()]) {
  // advanceTimers mantém o userEvent funcionando no teste que liga os timers falsos; nos outros não faz nada
  const user = userEvent.setup({
    advanceTimers: (ms) => {
      if (vi.isFakeTimers()) vi.advanceTimersByTime(ms);
    },
  });
  render(<AttendancePanel sessionId={SESSION_ID} students={students} />);
  return { user };
}

beforeEach(() => {
  records = new Map();
  requesterIsRoomTutor = true;
  networkIsSlow = false;
  heldResponses = [];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("[US09] Integração do AttendancePanel", () => {
  it("Deve enviar o PUT do status tocado e marcar o aluno com o horário devolvido pelo servidor", async () => {
    const { user } = renderPanel();

    await user.click(statusButton("Alice Souza", "Atraso"));

    expect(await within(rowOf("Alice Souza")).findByText(RECORDED_AT_LABEL)).toBeInTheDocument();
    expect(statusButton("Alice Souza", "Atraso")).toHaveAttribute("aria-pressed", "true");
    const puts = requestsWithMethod("PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0].url).toMatch(STUDENT_ROUTE);
    expect(puts[0].body).toEqual({ status: "LATE" });
    // O fakeBackend gravou: o que a tela mostra veio da resposta
    expect(records.get(STUDENT_ID)?.status).toBe("LATE");
  });

  it("Deve marcar o status na hora e deixar outro aluno ser alterado enquanto o servidor ainda não respondeu", async () => {
    networkIsSlow = true;
    const { user } = renderPanel();

    await user.click(statusButton("Alice Souza", "Falta"));

    // Antes de qualquer resposta: marcação visível e só a linha de Alice salvando
    expect(statusButton("Alice Souza", "Falta")).toHaveAttribute("aria-pressed", "true");
    expect(rowOf("Alice Souza")).toHaveAttribute("aria-busy", "true");
    screen.getAllByRole("button").forEach((button) => expect(button).toBeEnabled());
    expect(records.size).toBe(0);

    await user.click(statusButton("Bruno Lima", "Presente"));

    expect(requestsWithMethod("PUT").map((put) => put.body)).toEqual([{ status: "ABSENT" }, { status: "PRESENT" }]);
    expect(statusButton("Bruno Lima", "Presente")).toHaveAttribute("aria-pressed", "true");

    await releaseHeldResponses();

    await waitFor(() => expect(rowOf("Alice Souza")).not.toHaveAttribute("aria-busy", "true"));
    expect(rowOf("Bruno Lima")).not.toHaveAttribute("aria-busy", "true");
    expect(within(rowOf("Alice Souza")).getByText(RECORDED_AT_LABEL)).toBeInTheDocument();
    expect(within(rowOf("Bruno Lima")).getByText(RECORDED_AT_LABEL)).toBeInTheDocument();
    expect(records.get(STUDENT_ID)?.status).toBe("ABSENT");
    expect(records.get(OTHER_STUDENT_ID)?.status).toBe("PRESENT");
  });

  it("[QA] Deve avisar o timeout com a rede lenta, desfazer a marcação sem travar a lista e salvar no reenvio", async () => {
    // shouldAdvanceTime: o relógio falso também anda sozinho, para os findBy/waitFor do Testing Library
    vi.useFakeTimers({ shouldAdvanceTime: true });
    networkIsSlow = true;
    const { user } = renderPanel();

    // 1) Registro com a rede lenta: a marcação aparece antes da resposta
    await user.click(statusButton("Alice Souza", "Falta"));
    expect(statusButton("Alice Souza", "Falta")).toHaveAttribute("aria-pressed", "true");

    // 2) Sem resposta em 8 segundos: aviso de timeout e marcação desfeita
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(TIMEOUT_MESSAGE);
    expect(statusButton("Alice Souza", "Falta")).toHaveAttribute("aria-pressed", "false");
    expect(rowOf("Alice Souza")).not.toHaveAttribute("aria-busy", "true");
    // O aviso não bloqueia a lista
    screen.getAllByRole("button").forEach((button) => expect(button).toBeEnabled());
    expect(records.size).toBe(0);

    // 3) A rede volta e o tutor reenvia
    networkIsSlow = false;
    await user.click(statusButton("Alice Souza", "Falta"));

    expect(await within(rowOf("Alice Souza")).findByText(RECORDED_AT_LABEL)).toBeInTheDocument();
    expect(statusButton("Alice Souza", "Falta")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // O envio que expirou e o reenvio levam o mesmo status para a mesma rota
    const puts = requestsWithMethod("PUT");
    expect(puts.map((put) => put.body)).toEqual([{ status: "ABSENT" }, { status: "ABSENT" }]);
    puts.forEach((put) => expect(put.url).toMatch(STUDENT_ROUTE));
    expect(records.get(STUDENT_ID)?.status).toBe("ABSENT");
  });

  it("Deve exibir a recusa do backend e manter o status salvo quando o usuário não é o tutor da sala", async () => {
    requesterIsRoomTutor = false;
    const { user } = renderPanel([makeStudent({ status: "PRESENT", recordedAt: PREVIOUS_RECORDED_AT }), makeOtherStudent()]);

    await user.click(statusButton("Alice Souza", "Falta"));

    expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    expect(statusButton("Alice Souza", "Presente")).toHaveAttribute("aria-pressed", "true");
    expect(statusButton("Alice Souza", "Falta")).toHaveAttribute("aria-pressed", "false");
    expect(within(rowOf("Alice Souza")).getByText(PREVIOUS_RECORDED_AT_LABEL)).toBeInTheDocument();
    // A tentativa chegou ao backend, que recusou sem gravar
    const refused = requestsWithMethod("PUT");
    expect(refused).toHaveLength(1);
    expect(refused[0].url).toMatch(STUDENT_ROUTE);
    expect(refused[0].body).toEqual({ status: "ABSENT" });
    expect(records.size).toBe(0);

    // Depois da recusa, um valor diferente do inicial prova que a segunda gravação aconteceu
    requesterIsRoomTutor = true;
    await user.click(statusButton("Alice Souza", "Atraso"));

    expect(await within(rowOf("Alice Souza")).findByText(RECORDED_AT_LABEL)).toBeInTheDocument();
    expect(statusButton("Alice Souza", "Atraso")).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(records.get(STUDENT_ID)?.status).toBe("LATE");
  });
});
