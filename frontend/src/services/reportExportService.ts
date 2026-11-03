// src/services/reportExportService.ts

import type {
  ExportedFile,
  ExportFormat,
  ReportScope,
} from "../types/reportExport";

const DEFAULT_IN_PROGRESS_MESSAGE =
  "Relatório em processamento. Aguarde a conclusão antes de solicitar novamente.";
const DEFAULT_TIMEOUT_MESSAGE =
  "A geração do relatório demorou demais e não foi concluída. Tente novamente.";
const DEFAULT_EXPORT_ERROR_MESSAGE =
  "Não foi possível exportar o relatório.";

function buildExportUrl(scope: ReportScope, format: ExportFormat): string {
  const query = `?format=${encodeURIComponent(format)}`;

  switch (scope.type) {
    case "class":
      return `/api/v1/rooms/${scope.roomId}/reports/export${query}`;
    case "problem":
      return `/api/v1/rooms/${scope.roomId}/problems/${scope.problemId}/export${query}`;
    case "session":
      return `/api/v1/rooms/${scope.roomId}/sessions/${scope.sessionId}/export${query}`;
  }
}

function extractFileNameFromDisposition(
  disposition: string | null,
  format: ExportFormat
): string {
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;\s]+)/i);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1].replace(/["']/g, ""));
    }

    const standardMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (standardMatch?.[1]) {
      return standardMatch[1].trim();
    }
  }

  const extension = format.toLowerCase();
  return `relatorio.${extension}`;
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as { message?: string };
    if (typeof payload?.message === "string" && payload.message.trim() !== "") {
      return payload.message;
    }
  } catch {
    // Corpo não é JSON ou está vazio
  }
  return null;
}

export const reportExportService = {
  async exportReport(
    scope: ReportScope,
    format: ExportFormat
  ): Promise<ExportedFile> {
    const url = buildExportUrl(scope, format);
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      const backendMessage = await readErrorMessage(response);

      if (response.status === 409) {
        throw {
          status: 409,
          message: backendMessage ?? DEFAULT_IN_PROGRESS_MESSAGE,
        };
      }

      if (response.status === 504) {
        throw {
          status: 504,
          message: backendMessage ?? DEFAULT_TIMEOUT_MESSAGE,
        };
      }

      throw {
        status: response.status,
        message: backendMessage ?? DEFAULT_EXPORT_ERROR_MESSAGE,
      };
    }

    const disposition = response.headers.get("Content-Disposition");
    const fileName = extractFileNameFromDisposition(disposition, format);
    const textClone =
      typeof response.clone === "function" ? response.clone() : null;
    const blob = await response.blob();

    // Garante compatibilidade com ambientes DOM simulados (ex: jsdom) onde Blob.prototype.text pode não estar definido
    if (typeof blob.text !== "function" && textClone) {
      Object.defineProperty(blob, "text", {
        value: () => textClone.clone().text(),
        configurable: true,
      });
    }

    return {
      fileName,
      blob,
    };
  },
};
