import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Locator, type Page, type Request } from "@playwright/test";
import ExcelJS from "exceljs";
import { extractText, getDocumentProxy } from "unpdf";

const EXPORT_ROUTE =
  /\/api\/v1\/rooms\/[^/]+\/(?:reports|problems\/[^/]+|sessions\/[^/]+)\/export(\?.*)?$/;
const GENERATING_MESSAGE = /gerando documento, por favor aguarde\.\.\./i;

// Contrato do ClassReportResponse (relatório final da turma, testado no backend da US19/US20)
interface ClassReport {
  problems: Array<{ id: string; title: string }>;
  students: Array<{
    studentName: string;
    gradesByProblem: Record<string, number | null>;
    weightedAverage: number | null;
  }>;
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
let sessionId: string;

test.beforeAll(() => {
  roomId = requiredEnv(
    "E2E_ROOM_ID",
    "the UUID of a room whose Tutor is E2E_USER_ID, with active students and at least one graded problem",
  );
  problemId = requiredEnv("E2E_PROBLEM_ID", "the UUID of a problem of the room E2E_ROOM_ID");
  sessionId = requiredEnv(
    "E2E_SESSION_ID",
    "the UUID of a session of the problem E2E_PROBLEM_ID, with at least one student listed",
  );
});

function isExportRequest(request: Request) {
  return request.method() === "GET" && EXPORT_ROUTE.test(request.url());
}

function exportButtons(page: Page) {
  return {
    pdf: page.getByRole("button", { name: /pdf/i }),
    spreadsheet: page.getByRole("button", { name: /planilha/i }),
  };
}

// O filtro garante que o role="status" encontrado é o aviso de geração, não outro da tela
function generatingNotice(page: Page) {
  return page.getByRole("status").filter({ hasText: GENERATING_MESSAGE });
}

async function openClassPage(page: Page) {
  // Aba Matéria da sala, onde fica a exportação da turma inteira
  await page.goto(`/teacher-rooms/${roomId}/disciplines`);
}

async function openSessionPage(page: Page) {
  await page.goto(`/teacher-rooms/${roomId}/problems/${problemId}/sessions/${sessionId}/evaluate`);
}

// Clica e espera o arquivo baixado pelo navegador
async function download(page: Page, button: Locator): Promise<Download> {
  const [file] = await Promise.all([page.waitForEvent("download"), button.click()]);
  expect(await file.failure()).toBeNull();
  return file;
}

// "Abrir" o PDF: falha se o arquivo estiver corrompido; devolve o texto de todas as páginas
async function openPdf(file: Download): Promise<string> {
  const bytes = new Uint8Array(await readFile(await file.path()));
  expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  const pdf = await getDocumentProxy(bytes);
  expect(pdf.numPages).toBeGreaterThan(0);
  const { text } = await extractText(pdf, { mergePages: true });
  // Espaços normalizados: a extração de PDF quebra linhas e repete espaços
  return text.replace(/\s+/g, " ");
}

// "Abrir" a planilha: falha se o XLSX estiver corrompido; devolve as linhas de todas as abas
async function openSpreadsheet(file: Download): Promise<unknown[][]> {
  const workbook = new ExcelJS.Workbook();
  // ArrayBuffer: o tipo Buffer do exceljs é anterior ao Buffer genérico do @types/node atual
  const bytes = await readFile(await file.path());
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  expect(workbook.worksheets.length).toBeGreaterThan(0);
  const rows: unknown[][] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      rows.push((row.values as unknown[]).slice(1).map(cellValue));
    });
  });
  return rows;
}

// Fórmula vale pelo resultado; texto rico, pelo texto corrido
function cellValue(cell: unknown): unknown {
  if (cell && typeof cell === "object") {
    if ("result" in cell) return (cell as { result: unknown }).result;
    if ("richText" in cell) {
      return (cell as { richText: Array<{ text: string }> }).richText.map((part) => part.text).join("");
    }
  }
  return cell;
}

function rowOf(rows: unknown[][], name: string) {
  return rows.find((row) => row.some((cell) => String(cell).trim() === name));
}

function hasNumber(row: unknown[], value: number) {
  return row.some((cell) => typeof cell === "number" && Math.abs(cell - value) < 0.01);
}

// 6.8 aparece no PDF como "6,8", "6,80" ou "6.8": compara o número com 1 ou 2 casas, não a formatação
function numberPattern(value: number) {
  const texts = [value.toFixed(1), value.toFixed(2), ...(Number.isInteger(value) ? [String(value)] : [])];
  const variants = texts.map((text) => text.replace(".", "[.,]"));
  return new RegExp(`(?<![\\d.,])(?:${variants.join("|")})(?![\\d]|[.,]\\d)`);
}

// Nomes da lista "Avaliar Alunos" da sessão (US10, resolvida): cada aluno tem o botão "Avaliar <nome>"
async function sessionStudentNames(page: Page): Promise<string[]> {
  const buttons = page.getByRole("button", { name: /^Avaliar / });
  await expect(buttons.first()).toBeVisible();
  const labels = await buttons.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("aria-label") ?? ""),
  );
  return labels.map((label) => label.replace(/^Avaliar /, ""));
}

test("[E2E][US19][QA] Spam click no botão de PDF: uma única requisição, aviso de geração e um único arquivo", async ({ page }) => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (isExportRequest(request)) requests.push(request);
  });
  const downloads: Download[] = [];
  page.on("download", (file) => downloads.push(file));

  // A geração real só é entregue quando o teste libera: o estado "gerando" fica observável
  let releaseGeneration!: () => void;
  const generationReleased = new Promise<void>((resolve) => (releaseGeneration = resolve));
  await page.route(EXPORT_ROUTE, async (route) => {
    const response = await route.fetch();
    await generationReleased;
    await route.fulfill({ response });
  });

  await openClassPage(page);
  const { pdf, spreadsheet } = exportButtons(page);
  await expect(pdf).toBeEnabled();

  // Cliques no mesmo instante, dentro do navegador, antes de o React redesenhar os botões
  await pdf.evaluate((button: HTMLButtonElement) => {
    for (let i = 0; i < 10; i++) button.click();
  });

  await expect(generatingNotice(page)).toBeVisible();
  await expect(pdf).toBeDisabled();
  await expect(spreadsheet).toBeDisabled();
  await expect.poll(() => requests.length).toBe(1);
  expect(new URL(requests[0].url()).pathname).toBe(`/api/v1/rooms/${roomId}/reports/export`);
  expect(new URL(requests[0].url()).searchParams.get("format")?.toUpperCase()).toBe("PDF");

  releaseGeneration();

  await expect.poll(() => downloads.length).toBe(1);
  await expect(pdf).toBeEnabled();
  await expect(generatingNotice(page)).toHaveCount(0);
  // Nenhum clique extra chegou ao backend nem gerou arquivo depois da liberação
  expect(requests).toHaveLength(1);
  expect(downloads).toHaveLength(1);
  expect(downloads[0].suggestedFilename()).toMatch(/\.pdf$/);
  await openPdf(downloads[0]);
});

test("[E2E][US19][QA] Sessão: PDF e planilha abrem sem erro e trazem os alunos listados na tela", async ({ page }) => {
  await openSessionPage(page);
  const names = await sessionStudentNames(page);
  const { pdf, spreadsheet } = exportButtons(page);

  const pdfFile = await download(page, pdf);
  expect(pdfFile.suggestedFilename()).toMatch(/\.pdf$/);
  const pdfText = await openPdf(pdfFile);

  await expect(spreadsheet).toBeEnabled();
  const xlsxFile = await download(page, spreadsheet);
  expect(xlsxFile.suggestedFilename()).toMatch(/\.xlsx$/);
  const rows = await openSpreadsheet(xlsxFile);

  for (const name of names) {
    expect(pdfText, `o PDF da sessão não traz ${name}`).toContain(name);
    expect(rowOf(rows, name), `a planilha da sessão não traz ${name}`).toBeDefined();
  }
});

test("[E2E][US19][QA] Turma inteira: PDF e planilha abrem sem erro e trazem as notas por problema e a média ponderada do relatório final", async ({ page, request }) => {
  // Dados do relatório final (US20, resolvida) com a mesma identidade do navegador
  const reportResponse = await request.get(`/api/v1/rooms/${roomId}/reports/final`);
  expect(reportResponse.status()).toBe(200);
  const report = (await reportResponse.json()) as ClassReport;
  expect(report.students.length, "E2E_ROOM_ID precisa ter alunos ativos").toBeGreaterThan(0);
  expect(report.problems.length, "E2E_ROOM_ID precisa ter problemas").toBeGreaterThan(0);

  await openClassPage(page);
  const { pdf, spreadsheet } = exportButtons(page);

  const pdfFile = await download(page, pdf);
  expect(pdfFile.suggestedFilename()).toMatch(/\.pdf$/);
  const pdfText = await openPdf(pdfFile);

  await expect(spreadsheet).toBeEnabled();
  const xlsxFile = await download(page, spreadsheet);
  expect(xlsxFile.suggestedFilename()).toMatch(/\.xlsx$/);
  const rows = await openSpreadsheet(xlsxFile);

  // Notas organizadas por problema: cada problema do relatório tem a sua coluna/seção nos dois arquivos
  for (const { title } of report.problems) {
    expect(pdfText, `o PDF da turma não traz o problema ${title}`).toContain(title);
    expect(rowOf(rows, title), `a planilha da turma não traz o problema ${title}`).toBeDefined();
  }

  // Na planilha, notas e média são números na linha do aluno. No PDF, o layout da tabela é livre:
  // confere que cada valor aparece no texto, sem amarrá-lo à linha do aluno
  for (const { studentName, gradesByProblem, weightedAverage } of report.students) {
    expect(pdfText, `o PDF da turma não traz ${studentName}`).toContain(studentName);
    const row = rowOf(rows, studentName);
    expect(row, `a planilha da turma não traz ${studentName}`).toBeDefined();
    for (const grade of Object.values(gradesByProblem)) {
      if (grade === null) continue;
      expect(hasNumber(row!, grade), `a planilha da turma não traz a nota ${grade} de ${studentName}`).toBe(true);
      expect(pdfText, `o PDF da turma não traz a nota ${grade}`).toMatch(numberPattern(grade));
    }
    if (weightedAverage !== null) {
      const average = `a média ${weightedAverage} de ${studentName}`;
      expect(hasNumber(row!, weightedAverage), `a planilha da turma não traz ${average}`).toBe(true);
      expect(pdfText, `o PDF da turma não traz ${average}`).toMatch(numberPattern(weightedAverage));
    }
  }
});
