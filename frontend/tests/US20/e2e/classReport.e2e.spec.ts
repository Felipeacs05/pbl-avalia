import { expect, test, type APIRequestContext, type Locator, type Page, type Response } from "@playwright/test";

const FINAL_REPORT_ROUTE = /\/api\/v1\/rooms\/[^/?]+\/reports\/final$/;
const FORBIDDEN_MESSAGE = /apenas o tutor responsável pela sala pode emitir o relatório final/i;
const OPEN_PROBLEM_LABEL = /em andamento/i;
const EMPTY_VALUE_LABEL = "—";

// Massa da subtarefa [QA]: 8 no Problema 1 (peso 40%) e 7 no Problema 2 (peso 60%)
const QA_GRADE_P1 = 8;
const QA_GRADE_P2 = 7;
const QA_WEIGHT_P1 = 0.4;
const QA_WEIGHT_P2 = 0.6;
// Cálculo manual, feito aqui e não pela API: 8 × 0,4 + 7 × 0,6 = 3,2 + 4,2 = 7,4 (a média simples daria 7,5)
const QA_MANUAL_AVERAGE =
  (QA_GRADE_P1 * QA_WEIGHT_P1 + QA_GRADE_P2 * QA_WEIGHT_P2) / (QA_WEIGHT_P1 + QA_WEIGHT_P2);
const QA_WEIGHTED_AVERAGE_LABEL = "7,4";
const QA_SIMPLE_AVERAGE_LABEL = "7,5";

// Campos do ClassReportResponse que a tela usa
interface ReportBody {
  roomName: string;
  problems: Array<{ id: string; title: string; weight: number }>;
  students: Array<{
    studentId: string;
    studentName: string;
    gradesByProblem: Record<string, number>;
    weightedAverage: number | null;
  }>;
  openProblemIds: string[];
}

function requiredEnv(name: string, description: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to ${description}`);
  }
  return value;
}

let roomId: string;
let problemId: string;
let otherProblemId: string;
let studentId: string;
let baseURL: string;

// Mesmo formato da tela: uma casa decimal, vírgula, e "—" sem nota
function formatGrade(grade: number | null | undefined): string {
  if (grade === null || grade === undefined) return EMPTY_VALUE_LABEL;
  return grade.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
function forbiddenAlert(page: Page) {
  return page.getByRole("alert").filter({ hasText: FORBIDDEN_MESSAGE });
}

function activeTable(page: Page) {
  return page.getByRole("table", { name: /alunos ativos/i });
}

// Linha do aluno pela primeira célula, com o nome exato; o nome pode estar em <th scope="row"> ou <td>
function rowOf(table: Locator, studentName: string) {
  return table.getByRole("row").filter({ has: table.page().getByText(studentName, { exact: true }) });
}

async function rowValues(row: Locator): Promise<string[]> {
  const values = await row.getByRole("rowheader").or(row.getByRole("cell")).allTextContents();
  return values.map((value) => value.trim());
}

// Abre a página e espera o GET real; a URL da API é derivada do tráfego do frontend
async function openReport(page: Page): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.request().method() === "GET" && FINAL_REPORT_ROUTE.test(res.url())),
    page.goto(`/teacher-rooms/${roomId}/reports/final`),
  ]);
  expect(response.url()).toMatch(new RegExp(`/api/v1/rooms/${roomId}/reports/final$`));
  return response;
}

async function sendGrade(tutor: APIRequestContext, toProblemId: string, grade: number) {
  const response = await tutor.post(`/api/v1/problems/${toProblemId}/feedbacks`, {
    data: { studentId, grade, text: `Nota final E2E US20 (${grade})` },
  });
  expect(response.status(), `a nota de preparo do problema ${toProblemId} não foi gravada`).toBe(201);
}

test.beforeAll(async ({ playwright }, testInfo) => {
  roomId = requiredEnv(
    "E2E_ROOM_ID",
    "the UUID of a room whose Tutor is E2E_USER_ID and whose only concluded problems are E2E_PROBLEM_ID and E2E_OTHER_PROBLEM_ID",
  );
  problemId = requiredEnv(
    "E2E_PROBLEM_ID",
    `the UUID of a concluded problem of E2E_ROOM_ID with weight ${QA_WEIGHT_P1}, used only by this spec`,
  );
  otherProblemId = requiredEnv(
    "E2E_OTHER_PROBLEM_ID",
    `the UUID of another concluded problem of E2E_ROOM_ID with weight ${QA_WEIGHT_P2}, created after E2E_PROBLEM_ID and used only by this spec`,
  );
  studentId = requiredEnv("E2E_STUDENT_ID", "the UUID of an active student of E2E_ROOM_ID");
  baseURL = String(testInfo.project.use.baseURL);

  // Preparo pela API da US16 (considerada resolvida): a nota final do problema é a do feedback.
  // Valores fixos tornam o preparo repetível: rodar de novo grava as mesmas notas
  const tutor = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { "X-User-Id": requiredEnv("E2E_USER_ID", "the UUID of the Tutor") },
  });
  try {
    await sendGrade(tutor, problemId, QA_GRADE_P1);
    await sendGrade(tutor, otherProblemId, QA_GRADE_P2);
  } finally {
    await tutor.dispose();
  }
});

test("[E2E][US20][QA] Tutor emite o relatório e a média do aluno com 8 (40%) e 7 (60%) é 7,4 na API e na tela", async ({ page }) => {
  const response = await openReport(page);

  expect(response.status()).toBe(200);
  const report = (await response.json()) as ReportBody;
  // A massa que a API usou é a da subtarefa: pesos dos problemas e notas do aluno
  expect(report.problems).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: problemId, weight: QA_WEIGHT_P1 }),
      expect.objectContaining({ id: otherProblemId, weight: QA_WEIGHT_P2 }),
    ]),
  );
  const row = report.students.find((student) => student.studentId === studentId);
  expect(row, "E2E_STUDENT_ID precisa ser aluno ativo de E2E_ROOM_ID").toBeDefined();
  expect(
    row!.gradesByProblem,
    "o relatório não usou as notas de preparo: E2E_PROBLEM_ID e E2E_OTHER_PROBLEM_ID precisam ser exclusivos deste spec",
  ).toMatchObject({ [problemId]: QA_GRADE_P1, [otherProblemId]: QA_GRADE_P2 });
  // Média calculada pela API igual ao cálculo manual, com tolerância de Double
  expect(row!.weightedAverage).toBeCloseTo(QA_MANUAL_AVERAGE, 9);

  // A tela exibe a mesma média, e não a média simples das notas
  const table = activeTable(page);
  // allTextContents não espera: a tabela precisa estar na tela antes da leitura
  await expect(table).toBeVisible();
  const studentRow = rowOf(table, row!.studentName);
  // Exatamente uma linha: outro aluno com o mesmo nome tornaria a leitura ambígua
  await expect(studentRow).toHaveCount(1);
  const values = await rowValues(studentRow);
  const headers = (await table.getByRole("columnheader").allTextContents()).map((header) => header.trim());
  expect(values[headers.indexOf("Média")]).toBe(QA_WEIGHTED_AVERAGE_LABEL);
  expect(values).not.toContain(QA_SIMPLE_AVERAGE_LABEL);
  await expect(forbiddenAlert(page)).toHaveCount(0);
});

test("[E2E][US20] Relatório na tela traz as notas separadas por problema e a média de cada aluno, como a API devolveu", async ({ page }) => {
  const response = await openReport(page);
  expect(response.status()).toBe(200);
  const report = (await response.json()) as ReportBody;

  // O nome da sala não está na requisição: só pode ter vindo da resposta
  await expect(page.getByText(report.roomName)).toBeVisible();

  // Uma coluna por problema, na ordem do backend, com o aberto marcado
  const table = activeTable(page);
  await expect(table).toBeVisible();
  const headers = (await table.getByRole("columnheader").allTextContents()).map((header) => header.trim());
  expect(headers[0]).toBe("Aluno");
  expect(headers.at(-1)).toBe("Média");
  const problemHeaders = headers.slice(1, -1);
  expect(problemHeaders).toHaveLength(report.problems.length);
  report.problems.forEach((problem, index) => {
    expect(problemHeaders[index].startsWith(problem.title)).toBe(true);
    expect(OPEN_PROBLEM_LABEL.test(problemHeaders[index])).toBe(report.openProblemIds.includes(problem.id));
  });

  // Uma linha por aluno ativo, na ordem do backend, com a nota de cada problema e a média formatadas
  const rows = table.getByRole("row");
  await expect(rows).toHaveCount(report.students.length + 1);
  // A primeira linha é o cabeçalho; a posição de cada aluno precisa ser a da resposta
  for (const [index, student] of report.students.entries()) {
    expect(await rowValues(rows.nth(index + 1))).toEqual([
      student.studentName,
      ...report.problems.map((problem) => formatGrade(student.gradesByProblem[problem.id])),
      formatGrade(student.weightedAverage),
    ]);
  }
});

test("[E2E][US20] Aluno que abre o relatório pela URL recebe a negativa em português e nenhuma nota", async ({ browser }) => {
  // Contexto novo com a identidade do aluno: o config usa o tutor por padrão
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { "X-User-Id": studentId } });
  try {
    const page = await context.newPage();
    const response = await openReport(page);

    expect(response.status()).toBe(403);
    expect(await response.text()).not.toContain(`"weightedAverage"`);

    await expect(forbiddenAlert(page)).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByText(QA_WEIGHTED_AVERAGE_LABEL, { exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
