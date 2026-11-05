// src/services/reportService.ts
// Relatório final da sala (US20). Erros no contrato { status, message }; status 0 = sem resposta (rede).
import type { ClassReport } from "../types/report";
import { buildClassReportMock } from "../mocks/report.mock";
import { USE_REAL_API } from "./apiMode";
import { authFetch } from "./authFetch";

const FORBIDDEN_MESSAGE = "Apenas o tutor responsável pela sala pode emitir o relatório final.";
const DEFAULT_ERROR_MESSAGE = "Não foi possível carregar o relatório final.";
const NETWORK_ERROR_MESSAGE = "Sem conexão com o servidor. Tente novamente.";

export const reportService = {
  // Endpoint: GET /api/v1/rooms/{roomId}/reports/final (o tutor vem do token, não da requisição)
  async fetchClassReport(roomId: string): Promise<ClassReport> {
    if (!USE_REAL_API) {
      return new Promise((resolve) => setTimeout(() => resolve(buildClassReportMock(roomId)), 400));
    }

    let response: Response;
    try {
      response = await authFetch(`/api/v1/rooms/${roomId}/reports/final`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      throw { status: 0, message: NETWORK_ERROR_MESSAGE };
    }

    if (response.status === 403) {
      // O backend devolve uma mensagem genérica em inglês: a tela mostra a nossa, em português
      throw { status: 403, message: FORBIDDEN_MESSAGE };
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw { status: response.status, message: body?.message || DEFAULT_ERROR_MESSAGE };
    }
    return response.json();
  },
};
