import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionRolesPanel } from "@/components/features/session-roles/SessionRolesPanel";
import type { SessionRole, SessionRoleAssignment, SessionRoleStudent } from "@/types/sessionRole";
import {
  ASSIGNMENT_ID,
  EXTRA_GRADE_VALIDATION_MESSAGE,
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  makeOtherStudent,
  makeStudent,
  OTHER_STUDENT_ID,
  ROLE_LABELS,
  ROLE_TAKEN_MESSAGE,
  ROLE_TAKEN_TEXT,
  SESSION_ID,
  STUDENT_ID,
} from "../fixtures";

const ROLES_ROUTE = new RegExp(`/api/v1/sessions/${SESSION_ID}/roles/([A-Z_]+)$`);

// Estado do fakeBackend: um aluno por papel, como a chave única (sessão, papel) do backend
let assignments: Map<SessionRole, SessionRoleAssignment>;
let requesterIsRoomTutor: boolean;
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const role = url.match(ROLES_ROUTE)?.[1] as SessionRole | undefined;

  if (init.method !== "PUT" || !role) {
    return Promise.resolve(jsonResponse({}, 404));
  }
  const respond = () => {
    // Mesmas regras do backend: só o tutor da sala atribui (403 em texto puro) e um aluno por papel (422)
    if (!requesterIsRoomTutor) {
      return new Response(FORBIDDEN_TEXT, { status: 403 });
    }
    const { studentId, extraGrade } = JSON.parse(String(init.body)) as { studentId: string; extraGrade: number };
    if (assignments.has(role)) {
      return jsonResponse({ status: 422, error: "Unprocessable Content", message: ROLE_TAKEN_TEXT }, 422);
    }
    const student = [makeStudent(), makeOtherStudent()].find((s) => s.id === studentId)!;
    const saved: SessionRoleAssignment = {
      id: `${ASSIGNMENT_ID}-${role}`,
      sessionId: SESSION_ID,
      studentId,
      studentName: student.name,
      role,
      extraGrade,
    };
    assignments.set(role, saved);
    return jsonResponse(saved, 201);
  };
  // Rede lenta: a resposta só sai quando o teste libera
  return networkIsSlow
    ? new Promise((resolve) => heldResponses.push(() => resolve(respond())))
    : Promise.resolve(respond());
}

function requestsWithMethod(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined }));
}

// Quem tem qual papel no fakeBackend
function savedRoles() {
  return Object.fromEntries([...assignments.values()].map((a) => [a.studentId, a.role]));
}

function rowOf(name: string) {
  const item = screen.getAllByRole("listitem").find((li) => within(li).queryByText(name));
  if (!item) throw new Error(`linha do aluno ${name} não encontrada`);
  return item;
}

// A badge tem o mesmo texto da opção do select: as opções ficam fora da busca
function queryBadge(name: string, role: SessionRole) {
  return within(rowOf(name)).queryByText(ROLE_LABELS[role], { ignore: "script, style, option" });
}

async function assignThroughForm(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  role: SessionRole,
  extraGrade: string,
) {
  const row = within(rowOf(name));
  await user.selectOptions(row.getByLabelText(/papel/i), ROLE_LABELS[role]);
  await user.clear(row.getByLabelText(/nota extra/i));
  await user.type(row.getByLabelText(/nota extra/i), extraGrade);
  await user.click(row.getByRole("button", { name: /atribuir/i }));
}

async function releaseHeldResponses() {
  await act(async () => {
    heldResponses.splice(0).forEach((release) => release());
  });
}

function renderPanel(students: SessionRoleStudent[] = [makeStudent(), makeOtherStudent()]) {
  const user = userEvent.setup();
  render(<SessionRolesPanel sessionId={SESSION_ID} students={students} />);
  return { user };
}

beforeEach(() => {
  assignments = new Map();
  requesterIsRoomTutor = true;
  networkIsSlow = false;
  heldResponses = [];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US10] Integração do SessionRolesPanel", () => {
  it("Deve destacar o papel na hora, enviar o PUT do papel escolhido e manter a badge com a atribuição gravada", async () => {
    networkIsSlow = true;
    const { user } = renderPanel();

    await assignThroughForm(user, "Bruno Lima", "COORDINATOR", "1.5");

    // Antes de qualquer resposta: badge colorida e só a linha de Bruno salvando
    expect(queryBadge("Bruno Lima", "COORDINATOR")?.className).toMatch(/(^|\s)bg-\S+/);
    expect(rowOf("Bruno Lima")).toHaveAttribute("aria-busy", "true");
    expect(rowOf("Alice Souza")).not.toHaveAttribute("aria-busy", "true");
    expect(assignments.size).toBe(0);

    const puts = requestsWithMethod("PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0].url).toMatch(new RegExp(`/api/v1/sessions/${SESSION_ID}/roles/COORDINATOR$`));
    expect(puts[0].body).toEqual({ studentId: OTHER_STUDENT_ID, extraGrade: 1.5 });

    await releaseHeldResponses();

    await waitFor(() => expect(rowOf("Bruno Lima")).not.toHaveAttribute("aria-busy", "true"));
    expect(queryBadge("Bruno Lima", "COORDINATOR")).toBeInTheDocument();
    expect(queryBadge("Alice Souza", "COORDINATOR")).not.toBeInTheDocument();
    // O fakeBackend gravou o que a tela mostra
    expect(savedRoles()).toEqual({ [OTHER_STUDENT_ID]: "COORDINATOR" });
    expect(assignments.get("COORDINATOR")?.extraGrade).toBe(1.5);
  });

  it("[QA] Deve exibir a recusa do backend, desfazer o destaque e manter o primeiro Secretário quando o papel é atribuído a um segundo aluno", async () => {
    // Alice já é a Secretária de Quadro, na tela e no backend
    assignments.set("BOARD_SECRETARY", {
      id: `${ASSIGNMENT_ID}-BOARD_SECRETARY`, sessionId: SESSION_ID, studentId: STUDENT_ID,
      studentName: "Alice Souza", role: "BOARD_SECRETARY", extraGrade: 0.5,
    });
    const { user } = renderPanel([makeStudent({ role: "BOARD_SECRETARY", extraGrade: 0.5 }), makeOtherStudent()]);

    await assignThroughForm(user, "Bruno Lima", "BOARD_SECRETARY", "0.5");

    expect(await screen.findByRole("alert")).toHaveTextContent(ROLE_TAKEN_MESSAGE);
    await waitFor(() => expect(queryBadge("Bruno Lima", "BOARD_SECRETARY")).not.toBeInTheDocument());
    expect(queryBadge("Alice Souza", "BOARD_SECRETARY")).toBeInTheDocument();
    // A tentativa chegou ao backend, que recusou sem gravar
    const refused = requestsWithMethod("PUT");
    expect(refused).toHaveLength(1);
    expect(refused[0].url).toMatch(new RegExp(`/api/v1/sessions/${SESSION_ID}/roles/BOARD_SECRETARY$`));
    expect(refused[0].body).toEqual({ studentId: OTHER_STUDENT_ID, extraGrade: 0.5 });
    expect(savedRoles()).toEqual({ [STUDENT_ID]: "BOARD_SECRETARY" });

    // Secretário de Mesa é outro papel: a gravação acontece e o aviso some
    await assignThroughForm(user, "Bruno Lima", "TABLE_SECRETARY", "0.5");

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(queryBadge("Bruno Lima", "TABLE_SECRETARY")).toBeInTheDocument();
    expect(queryBadge("Alice Souza", "BOARD_SECRETARY")).toBeInTheDocument();
    const puts = requestsWithMethod("PUT");
    expect(puts).toHaveLength(2);
    expect(puts[1].url).toMatch(new RegExp(`/api/v1/sessions/${SESSION_ID}/roles/TABLE_SECRETARY$`));
    expect(puts[1].body).toEqual({ studentId: OTHER_STUDENT_ID, extraGrade: 0.5 });
    expect(savedRoles()).toEqual({ [STUDENT_ID]: "BOARD_SECRETARY", [OTHER_STUDENT_ID]: "TABLE_SECRETARY" });
  });

  it("Deve exibir a recusa do backend e desfazer o destaque quando o usuário não é o tutor da sala", async () => {
    requesterIsRoomTutor = false;
    const { user } = renderPanel();

    await assignThroughForm(user, "Alice Souza", "COORDINATOR", "1");

    expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    await waitFor(() => expect(queryBadge("Alice Souza", "COORDINATOR")).not.toBeInTheDocument());
    // A tentativa chegou ao backend, que recusou sem gravar
    const refused = requestsWithMethod("PUT");
    expect(refused).toHaveLength(1);
    expect(refused[0].url).toMatch(new RegExp(`/api/v1/sessions/${SESSION_ID}/roles/COORDINATOR$`));
    expect(refused[0].body).toEqual({ studentId: STUDENT_ID, extraGrade: 1 });
    expect(assignments.size).toBe(0);

    // Depois da recusa, outro papel prova que a segunda gravação aconteceu
    requesterIsRoomTutor = true;
    await assignThroughForm(user, "Alice Souza", "TABLE_SECRETARY", "0.5");

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(queryBadge("Alice Souza", "TABLE_SECRETARY")).toBeInTheDocument();
    expect(requestsWithMethod("PUT")).toHaveLength(2);
    expect(savedRoles()).toEqual({ [STUDENT_ID]: "TABLE_SECRETARY" });
  });

  it("Deve bloquear a nota extra fora de 0 a 10 sem chamar o backend e sem destacar o aluno", async () => {
    const { user } = renderPanel();

    await assignThroughForm(user, "Bruno Lima", "COORDINATOR", "10.5");

    expect(await screen.findByRole("alert")).toHaveTextContent(EXTRA_GRADE_VALIDATION_MESSAGE);
    expect(queryBadge("Bruno Lima", "COORDINATOR")).not.toBeInTheDocument();
    expect(requestsWithMethod("PUT")).toHaveLength(0);
    expect(assignments.size).toBe(0);
  });
});
