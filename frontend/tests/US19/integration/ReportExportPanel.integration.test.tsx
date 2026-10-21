import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportExportPanel } from "@/components/features/reports/ReportExportPanel";
import type { ReportScope } from "@/types/reportExport";
import {
  CLASS_SCOPE,
  FINAL_PDF_NAME,
  FINAL_XLSX_NAME,
  GENERATING_MESSAGE,
  IN_PROGRESS_MESSAGE,
  PARTIAL_PDF_NAME,
  PDF_TYPE,
  PROBLEM_ID,
  PROBLEM_SCOPE,
  ROOM_ID,
  SESSION_ID,
  SESSION_PDF_NAME,
  SESSION_SCOPE,
  XLSX_TYPE,
} from "../fixtures";

const EXPORT_ROUTE =
  /\/api\/v1\/rooms\/([^/]+)\/(?:reports\/export|problems\/([^/]+)\/export|sessions\/([^/]+)\/export)$/;

const FILE_FORMATS = {
  PDF: { extension: "pdf", contentType: PDF_TYPE },
  XLSX: { extension: "xlsx", contentType: XLSX_TYPE },
} as const;

// Arquivo salvo no computador: o nome do link de download e os bytes do blob
interface SavedFile {
  fileName: string;
  type: string;
  content: string;
}

// Estado do fakeBackend: rede lenta, gerações em andamento e o que foi salvo
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;
let generating: boolean;
let saved: Array<Promise<SavedFile>>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Bytes que identificam o escopo e o formato pedidos: o arquivo salvo precisa ser o do pedido
function fileContent(scopeLabel: string, format: keyof typeof FILE_FORMATS) {
  return `${format} ${scopeLabel}`;
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = new URL(String(input), "http://localhost");
  const match = url.pathname.match(EXPORT_ROUTE);
  // Mesma regra do ExportFormat.from: sem diferenciar maiúsculas/minúsculas
  const format = url.searchParams.get("format")?.toUpperCase() as keyof typeof FILE_FORMATS | undefined;
  if ((init.method ?? "GET") !== "GET" || !match || match[1] !== ROOM_ID || !format || !(format in FILE_FORMATS)) {
    return Promise.resolve(jsonResponse({}, 404));
  }
  const [, , problemId, sessionId] = match;
  const scopeLabel = problemId ? `problema ${problemId}` : sessionId ? `sessao ${sessionId}` : `turma ${ROOM_ID}`;
  const baseName = problemId ? "relatorio-parcial" : sessionId ? "relatorio-sessao" : "relatorio-final";

  // Como o ReportExportService: uma geração por vez; o clique durante a geração recebe 409
  if (generating) {
    return Promise.resolve(jsonResponse({ message: IN_PROGRESS_MESSAGE }, 409));
  }
  generating = true;
  const { extension, contentType } = FILE_FORMATS[format];
  const respond = () => {
    generating = false;
    return new Response(fileContent(scopeLabel, format), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${baseName}.${extension}"`,
      },
    });
  };
  // Rede lenta: a geração só termina quando o teste libera
  return networkIsSlow
    ? new Promise((resolve) => heldResponses.push(() => resolve(respond())))
    : Promise.resolve(respond());
}

function exportRequests() {
  return vi.mocked(fetch).mock.calls.map(([url, init]) => {
    const parsed = new URL(String(url), "http://localhost");
    return {
      method: init?.method ?? "GET",
      path: parsed.pathname,
      format: parsed.searchParams.get("format")?.toUpperCase(),
    };
  });
}

async function releaseHeldResponses() {
  await act(async () => {
    heldResponses.splice(0).forEach((release) => release());
  });
}

async function savedFiles() {
  return Promise.all(saved);
}

function renderPanel(scope: ReportScope = CLASS_SCOPE) {
  const view = render(<ReportExportPanel scope={scope} />);
  const user = userEvent.setup();
  const pdfButton = () => screen.getByRole("button", { name: /pdf/i });
  const spreadsheetButton = () => screen.getByRole("button", { name: /planilha/i });
  // Um download por vez: espera o arquivo ser salvo e os botões voltarem antes do próximo clique
  const exportAndWait = async (button: () => HTMLElement) => {
    const before = saved.length;
    await user.click(button());
    await waitFor(() => expect(saved).toHaveLength(before + 1));
    await waitFor(() => expect(pdfButton()).toBeEnabled());
  };
  return { ...view, user, pdfButton, spreadsheetButton, exportAndWait };
}

// O jsdom não implementa createObjectURL nem navega: o clique no link é capturado como "arquivo salvo"
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;

beforeEach(() => {
  networkIsSlow = false;
  heldResponses = [];
  generating = false;
  saved = [];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));

  const blobs = new Map<string, Blob>();
  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:http://localhost/${blobs.size}`;
    blobs.set(url, blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    const blob = blobs.get(this.href);
    if (!blob) return;
    const { download } = this;
    saved.push(blob.text().then((content) => ({ fileName: download, type: blob.type, content })));
  });
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

describe("[US19] Integração do ReportExportPanel", () => {
  it("[QA] Deve fazer uma única requisição e salvar um único arquivo sob cliques rápidos repetidos nos botões de download", async () => {
    networkIsSlow = true;
    const { pdfButton, spreadsheetButton } = renderPanel(CLASS_SCOPE);

    // Spam click: cliques seguidos nos dois botões enquanto o primeiro PDF é gerado
    for (let i = 0; i < 10; i++) {
      fireEvent.click(pdfButton());
      fireEvent.click(spreadsheetButton());
    }

    expect(screen.getByRole("status")).toHaveTextContent(GENERATING_MESSAGE);
    expect(pdfButton()).toBeDisabled();
    expect(spreadsheetButton()).toBeDisabled();
    expect(exportRequests()).toEqual([
      { method: "GET", path: `/api/v1/rooms/${ROOM_ID}/reports/export`, format: "PDF" },
    ]);

    await releaseHeldResponses();

    await waitFor(() => expect(pdfButton()).toBeEnabled());
    expect(spreadsheetButton()).toBeEnabled();
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument();
    // Nenhum clique repetido chegou ao backend: sem 409 e sem segundo arquivo
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(await savedFiles()).toEqual([
      { fileName: FINAL_PDF_NAME, type: PDF_TYPE, content: fileContent(`turma ${ROOM_ID}`, "PDF") },
    ]);
  });

  it("[QA] Deve salvar PDF e planilha de uma única sessão e da turma inteira, cada um com o conteúdo do pedido", async () => {
    // Apenas uma sessão
    const session = renderPanel(SESSION_SCOPE);
    await session.exportAndWait(session.pdfButton);
    await session.exportAndWait(session.spreadsheetButton);
    session.unmount();

    // Turma inteira
    const wholeClass = renderPanel(CLASS_SCOPE);
    await wholeClass.exportAndWait(wholeClass.pdfButton);
    await wholeClass.exportAndWait(wholeClass.spreadsheetButton);

    // Cada arquivo tem o nome, o tipo e os bytes que o backend gerou para aquele escopo e formato
    expect(await savedFiles()).toEqual([
      { fileName: SESSION_PDF_NAME, type: PDF_TYPE, content: fileContent(`sessao ${SESSION_ID}`, "PDF") },
      { fileName: "relatorio-sessao.xlsx", type: XLSX_TYPE, content: fileContent(`sessao ${SESSION_ID}`, "XLSX") },
      { fileName: FINAL_PDF_NAME, type: PDF_TYPE, content: fileContent(`turma ${ROOM_ID}`, "PDF") },
      { fileName: FINAL_XLSX_NAME, type: XLSX_TYPE, content: fileContent(`turma ${ROOM_ID}`, "XLSX") },
    ]);
    expect(exportRequests().map((request) => `${request.path} ${request.format}`)).toEqual([
      `/api/v1/rooms/${ROOM_ID}/sessions/${SESSION_ID}/export PDF`,
      `/api/v1/rooms/${ROOM_ID}/sessions/${SESSION_ID}/export XLSX`,
      `/api/v1/rooms/${ROOM_ID}/reports/export PDF`,
      `/api/v1/rooms/${ROOM_ID}/reports/export XLSX`,
    ]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve salvar o relatório parcial de um único problema", async () => {
    const { exportAndWait, pdfButton } = renderPanel(PROBLEM_SCOPE);

    await exportAndWait(pdfButton);

    expect(exportRequests()).toEqual([
      { method: "GET", path: `/api/v1/rooms/${ROOM_ID}/problems/${PROBLEM_ID}/export`, format: "PDF" },
    ]);
    expect(await savedFiles()).toEqual([
      { fileName: PARTIAL_PDF_NAME, type: PDF_TYPE, content: fileContent(`problema ${PROBLEM_ID}`, "PDF") },
    ]);
  });

  it("Deve exibir a recusa do backend e não salvar nada quando outra geração da sala já está em andamento", async () => {
    // Outra aba do mesmo tutor já está gerando o relatório da sala
    generating = true;
    const { user, pdfButton } = renderPanel(CLASS_SCOPE);

    await user.click(pdfButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(IN_PROGRESS_MESSAGE);
    expect(pdfButton()).toBeEnabled();
    expect(screen.queryByText(GENERATING_MESSAGE)).not.toBeInTheDocument();
    expect(saved).toHaveLength(0);
    // A recusa veio do backend: o front pediu uma única vez
    expect(exportRequests()).toHaveLength(1);
  });
});
