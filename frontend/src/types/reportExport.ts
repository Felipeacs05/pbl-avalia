// src/types/reportExport.ts

export type ExportFormat = "PDF" | "XLSX";

export interface ClassReportScope {
  type: "class";
  roomId: string;
}

export interface ProblemReportScope {
  type: "problem";
  roomId: string;
  problemId: string;
}

export interface SessionReportScope {
  type: "session";
  roomId: string;
  sessionId: string;
}

export type ReportScope =
  | ClassReportScope
  | ProblemReportScope
  | SessionReportScope;

export interface ExportedFile {
  fileName: string;
  blob: Blob;
}

export interface ReportExportError {
  status: number;
  message: string;
}
