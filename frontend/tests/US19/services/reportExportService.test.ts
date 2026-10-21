import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportExportService } from "@/services/reportExportService";
import {
  CLASS_SCOPE,
  FINAL_PDF_NAME,
  FINAL_XLSX_NAME,
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

// Arquivo como o ReportController devolve: bytes + Content-Type + Content-Disposition de anexo
function fileResponse(content: string, contentType: string, fileName: string): Response {
  // Corpo em texto: o Blob do jsdom não é aceito pelo Response do Node; o tipo vem do Content-Type
  return new Response(content, {
    status: 200,
    headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${fileName}"` },
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// A URL pode ser relativa: a base só serve para ler o caminho e os parâmetros
function singleFetchCall() {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  const parsed = new URL(String(url), "http://localhost");
  // O ExportFormat.from do backend ignora maiúsculas/minúsculas: o formato é comparado sem diferenciá-las
  const format = parsed.searchParams.get("format")?.toUpperCase();
  return { path: parsed.pathname, format, init: init ?? {} };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("[US19] reportExportService", () => {
  it("Deve pedir com GET o PDF da turma inteira e devolver o arquivo com o nome do Content-Disposition", async () => {
    vi.mocked(fetch).mockResolvedValue(fileResponse("%PDF-1.7 conteudo", PDF_TYPE, FINAL_PDF_NAME));

    const file = await reportExportService.exportReport(CLASS_SCOPE, "PDF");

    // O nome vem do backend: o front não inventa nomes de arquivo
    expect(file.fileName).toBe(FINAL_PDF_NAME);
    expect(file.blob.type).toBe(PDF_TYPE);
    await expect(file.blob.text()).resolves.toBe("%PDF-1.7 conteudo");

    const { path, format, init } = singleFetchCall();
    expect(path).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/reports/export$`));
    expect(format).toBe("PDF");
    expect(init.method ?? "GET").toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("Deve pedir a planilha da turma inteira com format=XLSX", async () => {
    vi.mocked(fetch).mockResolvedValue(fileResponse("PK-planilha", XLSX_TYPE, FINAL_XLSX_NAME));

    const file = await reportExportService.exportReport(CLASS_SCOPE, "XLSX");

    expect(file.fileName).toBe(FINAL_XLSX_NAME);
    expect(file.blob.type).toBe(XLSX_TYPE);
    const { path, format } = singleFetchCall();
    expect(path).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/reports/export$`));
    expect(format).toBe("XLSX");
  });

  it("Deve pedir o relatório de um único problema na rota de exportação parcial", async () => {
    vi.mocked(fetch).mockResolvedValue(fileResponse("%PDF-1.7 partial", PDF_TYPE, PARTIAL_PDF_NAME));

    const file = await reportExportService.exportReport(PROBLEM_SCOPE, "PDF");

    expect(file.fileName).toBe(PARTIAL_PDF_NAME);
    const { path, format } = singleFetchCall();
    expect(path).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/problems/${PROBLEM_ID}/export$`));
    expect(format).toBe("PDF");
  });

  it("Deve pedir o relatório de uma única sessão na rota de exportação da sessão", async () => {
    vi.mocked(fetch).mockResolvedValue(fileResponse("%PDF-1.7 sessao", PDF_TYPE, SESSION_PDF_NAME));

    const file = await reportExportService.exportReport(SESSION_SCOPE, "PDF");

    expect(file.fileName).toBe(SESSION_PDF_NAME);
    // Rota proposta, no mesmo padrão da exportação por problema: ainda falta no backend
    const { path, format } = singleFetchCall();
    expect(path).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/sessions/${SESSION_ID}/export$`));
    expect(format).toBe("PDF");
  });

  it("Deve rejeitar com 409 e a mensagem do backend quando já há um relatório em processamento", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: IN_PROGRESS_MESSAGE }, 409));

    await expect(reportExportService.exportReport(CLASS_SCOPE, "PDF"))
      .rejects.toEqual({ status: 409, message: IN_PROGRESS_MESSAGE });
    singleFetchCall();
  });
});
