import type { ExportedFile, ReportScope } from "@/types/reportExport";

// Os testes de backend da US19 usam UUIDs aleatórios; aqui ficam fixos, com sala e problema herdados das US anteriores
export const ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
export const PROBLEM_ID = "555e5555-e55b-55d5-a555-555555555555";
export const SESSION_ID = "777e7777-e77b-77d7-a777-777777777777";

export const CLASS_SCOPE: ReportScope = { type: "class", roomId: ROOM_ID };
export const PROBLEM_SCOPE: ReportScope = { type: "problem", roomId: ROOM_ID, problemId: PROBLEM_ID };
// Sem rota no backend ainda: segue o padrão da exportação por problema
export const SESSION_SCOPE: ReportScope = { type: "session", roomId: ROOM_ID, sessionId: SESSION_ID };

// Mesmos tipos e nomes de arquivo dos testes de backend da US19
export const PDF_TYPE = "application/pdf";
export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const FINAL_PDF_NAME = "relatorio-final.pdf";
export const FINAL_XLSX_NAME = "relatorio-final.xlsx";
export const PARTIAL_PDF_NAME = "relatorio-parcial.pdf";
export const SESSION_PDF_NAME = "relatorio-sessao.pdf";

// 409 do ReportExportService quando já há uma geração em andamento para a sala
export const IN_PROGRESS_MESSAGE = "Relatório em processamento. Aguarde a conclusão antes de solicitar novamente.";

// Texto completo exigido pelo critério de Desempenho; nas asserções, a regex
export const GENERATING_MESSAGE = /gerando documento, por favor aguarde\.\.\./i;

// Contrato de erro do service: { status, message }
export const makeInProgressError = () => ({ status: 409, message: IN_PROGRESS_MESSAGE });

export function makeExportedFile(overrides: Partial<ExportedFile> = {}): ExportedFile {
  return {
    fileName: FINAL_PDF_NAME,
    blob: new Blob(["%PDF-1.7 conteudo"], { type: PDF_TYPE }),
    ...overrides,
  };
}
