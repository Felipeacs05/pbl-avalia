import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { ClassReportPanel } from "@/components/features/reports/ClassReportPanel";
import {
  BACKEND_FORBIDDEN_BODY,
  EMPTY_VALUE_LABEL,
  FORBIDDEN_MESSAGE,
  OPEN_PROBLEM_ID,
  OPEN_PROBLEM_LABEL,
  OTHER_PROBLEM_ID,
  OTHER_STUDENT_ID,
  OTHER_STUDENT_NAME,
  PROBLEM_ID,
  QA_GRADE_P1,
  QA_GRADE_P2,
  QA_SIMPLE_AVERAGE_LABEL,
  QA_WEIGHT_P1,
  QA_WEIGHT_P2,
  QA_WEIGHTED_AVERAGE_LABEL,
  ROOM_ID,
  ROOM_NAME,
  STUDENT_ID,
  STUDENT_NAME,
  TUTOR_ID,
  WITHDRAWN_STUDENT_ID,
  WITHDRAWN_STUDENT_NAME,
} from "../fixtures";

const FINAL_REPORT_ROUTE = /\/api\/v1\/rooms\/([^/?]+)\/reports\/final$/;

// Dados como estão no banco: problemas com peso e situação, vínculos e notas finais
interface StoredProblem {
  id: string;
  title: string;
  weight: number;
  createdAt: string;
  open: boolean;
}

interface StoredMember {
  studentId: string;
  name: string;
  active: boolean;
  unlinkedAt: string | null;
}

interface StoredGrade {
  problemId: string;
  studentId: string;
  grade: number;
}

// Estado do fakeBackend: a sala, quem está logado e se a rede segura a resposta
let problems: StoredProblem[];
let members: StoredMember[];
let grades: StoredGrade[];
let loggedUserId: string;
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function gradesOf(studentId: string): Record<string, number> {
  return Object.fromEntries(
    grades.filter((grade) => grade.studentId === studentId).map((grade) => [grade.problemId, grade.grade]),
  );
}

// Regras fixadas pelos testes de backend da US20: peso negativo fica fora, soma de pesos zero dá média nula
// e só contam os problemas em que o aluno tem nota (6,8 no ClassReportIntegrationTest); problema aberto não conta.
// O cálculo é do backend: aqui só produz a resposta, e a tela precisa exibi-la sem recalcular
function averageOf(studentGrades: Record<string, number>): number | null {
  const counted = problems.filter((problem) => !problem.open && problem.weight >= 0 && problem.id in studentGrades);
  const totalWeight = counted.reduce((sum, problem) => sum + problem.weight, 0);
  if (totalWeight === 0) return null;
  return counted.reduce((sum, problem) => sum + studentGrades[problem.id] * problem.weight, 0) / totalWeight;
}

function buildReport() {
  const ordered = [...problems].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const counted = ordered.filter((problem) => !problem.open && problem.weight >= 0);
  // Ativos em ordem alfabética; quem saiu só aparece se chegou a ter nota
  const students = members
    .filter((member) => member.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((member) => {
      const studentGrades = gradesOf(member.studentId);
      return {
        studentId: member.studentId,
        studentName: member.name,
        gradesByProblem: studentGrades,
        weightedAverage: averageOf(studentGrades),
        pendingProblemIds: counted.filter((problem) => !(problem.id in studentGrades)).map((problem) => problem.id),
      };
    });
  const withdrawnStudents = members
    .filter((member) => !member.active && Object.keys(gradesOf(member.studentId)).length > 0)
    .map((member) => ({
      studentId: member.studentId,
      studentName: member.name,
      unlinkedAt: member.unlinkedAt,
      gradesByProblem: gradesOf(member.studentId),
      partialAverage: averageOf(gradesOf(member.studentId)),
    }));
  const warnings = ordered
    .filter((problem) => problem.weight < 0)
    .map((problem) => ({
      code: "INVALID_WEIGHT",
      problemId: problem.id,
      studentId: null,
      message: `Peso inválido no ${problem.title}: o problema foi desconsiderado no cálculo.`,
    }));
  return {
    roomId: ROOM_ID,
    roomName: ROOM_NAME,
    problems: ordered.map(({ id, title, weight }) => ({ id, title, weight })),
    students,
    openProblemIds: ordered.filter((problem) => problem.open).map((problem) => problem.id),
    withdrawnStudents,
    warnings,
  };
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const roomId = String(input).match(FINAL_REPORT_ROUTE)?.[1];

  if ((init.method ?? "GET") !== "GET" || roomId !== ROOM_ID) {
    return Promise.resolve(jsonResponse({}, 404));
  }
  const respond = () =>
    // Mesma regra do RoomSecurity: só o tutor dono da sala emite o relatório (403 com JSON genérico)
    loggedUserId !== TUTOR_ID ? jsonResponse(BACKEND_FORBIDDEN_BODY, 403) : jsonResponse(buildReport(), 200);
  // Rede lenta: a resposta só sai quando o teste libera
  return networkIsSlow
    ? new Promise((resolve) => heldResponses.push(() => resolve(respond())))
    : Promise.resolve(respond());
}

function requestsWithMethod(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({ url: String(url), body: init?.body }));
}

async function releaseHeldResponses() {
  await act(async () => {
    heldResponses.splice(0).forEach((release) => release());
  });
}

function headers(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole("columnheader")
    .map((header) => header.textContent?.trim() ?? "");
}

// Valor na interseção aluno × coluna, localizando a coluna pelo cabeçalho
function cellText(table: HTMLElement, studentName: string, column: RegExp): string {
  const index = headers(table).findIndex((header) => column.test(header));
  expect(index).toBeGreaterThan(-1);
  const row = within(table).getByRole("row", { name: new RegExp(studentName) });
  const values = [...within(row).queryAllByRole("rowheader"), ...within(row).queryAllByRole("cell")];
  return values[index].textContent?.trim() ?? "";
}

function renderPanel() {
  return render(<ClassReportPanel roomId={ROOM_ID} />);
}

beforeEach(() => {
  // Gravados fora de ordem: problemas e alunos precisam sair na ordem do backend
  problems = [
    { id: OTHER_PROBLEM_ID, title: "Problema 2", weight: QA_WEIGHT_P2, createdAt: "2026-03-08T10:00:00Z", open: false },
    { id: PROBLEM_ID, title: "Problema 1", weight: QA_WEIGHT_P1, createdAt: "2026-03-01T10:00:00Z", open: false },
  ];
  members = [
    { studentId: OTHER_STUDENT_ID, name: OTHER_STUDENT_NAME, active: true, unlinkedAt: null },
    { studentId: STUDENT_ID, name: STUDENT_NAME, active: true, unlinkedAt: null },
    { studentId: WITHDRAWN_STUDENT_ID, name: WITHDRAWN_STUDENT_NAME, active: false, unlinkedAt: "2026-05-10T13:00:00Z" },
  ];
  // Massa da subtarefa [QA] para o Aluno A; valores distintos para o Aluno B e o Ex-Aluno
  grades = [
    { problemId: PROBLEM_ID, studentId: STUDENT_ID, grade: QA_GRADE_P1 },
    { problemId: OTHER_PROBLEM_ID, studentId: STUDENT_ID, grade: QA_GRADE_P2 },
    { problemId: OTHER_PROBLEM_ID, studentId: OTHER_STUDENT_ID, grade: 5.5 },
    { problemId: PROBLEM_ID, studentId: OTHER_STUDENT_ID, grade: 9 },
    { problemId: PROBLEM_ID, studentId: WITHDRAWN_STUDENT_ID, grade: 3 },
    { problemId: OTHER_PROBLEM_ID, studentId: WITHDRAWN_STUDENT_ID, grade: 4 },
  ];
  loggedUserId = TUTOR_ID;
  networkIsSlow = false;
  heldResponses = [];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US20] Integração do ClassReportPanel", () => {
  it("Deve buscar com GET o relatório da sala e exibir as notas separadas por problema e a média de cada aluno", async () => {
    networkIsSlow = true;
    renderPanel();

    // Antes da resposta: carregando, sem tabela e sem média nenhuma
    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    const gets = requestsWithMethod("GET");
    expect(gets).toHaveLength(1);
    expect(gets[0].url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/reports/final$`));
    // O tutor vem do token, não da requisição
    expect(gets[0].body).toBeUndefined();

    await releaseHeldResponses();

    const table = await screen.findByRole("table", { name: /alunos ativos/i });
    // O nome da sala não está na requisição: só pode ter vindo da resposta
    expect(screen.getByText(ROOM_NAME)).toBeInTheDocument();
    expect(headers(table)).toEqual(["Aluno", "Problema 1", "Problema 2", "Média"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(STUDENT_NAME);
    expect(rows[1]).toHaveTextContent(OTHER_STUDENT_NAME);
    expect(cellText(table, OTHER_STUDENT_NAME, /^Problema 1/)).toBe("9,0");
    expect(cellText(table, OTHER_STUDENT_NAME, /^Problema 2/)).toBe("5,5");
    // 9 × 0,4 + 5,5 × 0,6 = 6,9
    expect(cellText(table, OTHER_STUDENT_NAME, /^Média/)).toBe("6,9");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Uma busca só: a tela não refaz a requisição depois de receber o relatório
    expect(requestsWithMethod("GET")).toHaveLength(1);
  });

  it("[QA] Deve exibir para o aluno com 8 no Problema 1 (40%) e 7 no Problema 2 (60%) a média 7,4 do cálculo manual", async () => {
    renderPanel();

    const table = await screen.findByRole("table", { name: /alunos ativos/i });
    expect(cellText(table, STUDENT_NAME, /^Problema 1/)).toBe("8,0");
    expect(cellText(table, STUDENT_NAME, /^Problema 2/)).toBe("7,0");
    // 8 × 0,4 + 7 × 0,6 = 3,2 + 4,2 = 7,4
    expect(cellText(table, STUDENT_NAME, /^Média/)).toBe(QA_WEIGHTED_AVERAGE_LABEL);
    // 7,5 seria a média simples, ignorando os pesos
    expect(within(table).queryByText(QA_SIMPLE_AVERAGE_LABEL)).not.toBeInTheDocument();
  });

  it("Deve exibir à parte, com a média parcial, o aluno que encerrou o vínculo e chegou a ter nota", async () => {
    renderPanel();

    const active = await screen.findByRole("table", { name: /alunos ativos/i });
    expect(within(active).queryByText(WITHDRAWN_STUDENT_NAME)).not.toBeInTheDocument();

    const withdrawn = screen.getByRole("table", { name: /vínculo encerrado/i });
    expect(headers(withdrawn)).toEqual(["Aluno", "Problema 1", "Problema 2", "Média parcial"]);
    // 3 × 0,4 + 4 × 0,6 = 3,6
    expect(cellText(withdrawn, WITHDRAWN_STUDENT_NAME, /^Média parcial/)).toBe("3,6");
  });

  it("Deve marcar em andamento a coluna do problema ainda aberto, sem nota e sem alterar a média exibida", async () => {
    problems.push({ id: OPEN_PROBLEM_ID, title: "Problema 3", weight: 1, createdAt: "2026-03-15T10:00:00Z", open: true });
    renderPanel();

    const table = await screen.findByRole("table", { name: /alunos ativos/i });
    const [, first, second, open] = headers(table);
    expect(open).toMatch(/^Problema 3/);
    expect(open).toMatch(OPEN_PROBLEM_LABEL);
    expect(first).not.toMatch(OPEN_PROBLEM_LABEL);
    expect(second).not.toMatch(OPEN_PROBLEM_LABEL);
    expect(cellText(table, STUDENT_NAME, /^Problema 3/)).toBe(EMPTY_VALUE_LABEL);
    expect(cellText(table, STUDENT_NAME, /^Média/)).toBe(QA_WEIGHTED_AVERAGE_LABEL);
  });

  it("Deve exibir o aviso do backend e a média sem o problema de peso inválido", async () => {
    // Peso corrompido no banco: o backend ignora o problema e avisa, sem recusar o relatório
    problems = problems.map((problem) => (problem.id === OTHER_PROBLEM_ID ? { ...problem, weight: -1 } : problem));
    renderPanel();

    const table = await screen.findByRole("table", { name: /alunos ativos/i });
    expect(screen.getByText(/peso inválido no problema 2/i)).toBeInTheDocument();
    // Sobra só o Problema 1 e a API devolve 8; recalcular na tela com as duas notas daria 7,4 ou 7,5
    expect(cellText(table, STUDENT_NAME, /^Média/)).toBe("8,0");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve exibir a negativa em português e nenhuma nota quando quem abre não é o tutor da sala", async () => {
    loggedUserId = STUDENT_ID;
    renderPanel();

    expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    // A mensagem genérica em inglês do backend não chega à tela
    expect(screen.getByRole("alert")).not.toHaveTextContent(BACKEND_FORBIDDEN_BODY.message);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(STUDENT_NAME)).not.toBeInTheDocument();
    expect(screen.queryByText(WITHDRAWN_STUDENT_NAME)).not.toBeInTheDocument();
    // A tentativa chegou ao backend, que negou
    expect(requestsWithMethod("GET")).toHaveLength(1);
  });
});
