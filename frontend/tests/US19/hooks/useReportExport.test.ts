import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useReportExport } from "@/hooks/useReportExport";
import { reportExportService } from "@/services/reportExportService";
import { downloadFile } from "@/utils/downloadFile";
import type { ExportedFile } from "@/types/reportExport";
import {
  CLASS_SCOPE,
  IN_PROGRESS_MESSAGE,
  makeExportedFile,
  makeInProgressError,
  PROBLEM_SCOPE,
} from "../fixtures";

vi.mock("@/services/reportExportService", () => ({
  reportExportService: { exportReport: vi.fn() },
}));
vi.mock("@/utils/downloadFile", () => ({ downloadFile: vi.fn() }));

const service = vi.mocked(reportExportService);

// Geração que só termina quando o teste libera: permite observar o estado "gerando"
function heldExport() {
  let release!: (file: ExportedFile) => void;
  service.exportReport.mockReturnValueOnce(new Promise<ExportedFile>((resolve) => (release = resolve)));
  return (file: ExportedFile) => act(async () => release(file));
}

describe("[US19] useReportExport", () => {
  it("Deve gerar o formato pedido para o escopo informado, sinalizar a geração e salvar o arquivo recebido", async () => {
    const file = makeExportedFile();
    const finish = heldExport();
    const { result } = renderHook(() => useReportExport(PROBLEM_SCOPE));
    expect(result.current.isGenerating).toBe(false);

    act(() => {
      void result.current.exportReport("PDF");
    });

    expect(result.current.isGenerating).toBe(true);
    expect(service.exportReport).toHaveBeenCalledWith(PROBLEM_SCOPE, "PDF");
    expect(downloadFile).not.toHaveBeenCalled();

    await finish(file);

    expect(result.current.isGenerating).toBe(false);
    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(downloadFile).toHaveBeenCalledWith(file);
    expect(result.current.error).toBeNull();
  });

  it("[QA] Deve fazer uma única requisição quando o botão recebe vários cliques antes de a tela atualizar", async () => {
    const finish = heldExport();
    const { result } = renderHook(() => useReportExport(CLASS_SCOPE));

    // Spam click: todas as chamadas no mesmo instante, antes de isGenerating chegar à tela
    act(() => {
      const { exportReport } = result.current;
      void exportReport("PDF");
      void exportReport("PDF");
      void exportReport("XLSX");
      void exportReport("PDF");
    });

    expect(service.exportReport).toHaveBeenCalledTimes(1);
    await finish(makeExportedFile());
    expect(downloadFile).toHaveBeenCalledTimes(1);

    // Terminada a geração, o bloqueio é liberado para um novo download
    service.exportReport.mockResolvedValueOnce(makeExportedFile());
    await act(() => result.current.exportReport("XLSX"));
    expect(service.exportReport).toHaveBeenCalledTimes(2);
    expect(service.exportReport).toHaveBeenLastCalledWith(CLASS_SCOPE, "XLSX");
  });

  it("Deve expor a mensagem do 409, não salvar nada e liberar o botão quando o backend recusa a geração", async () => {
    service.exportReport.mockRejectedValueOnce(makeInProgressError());
    const { result } = renderHook(() => useReportExport(CLASS_SCOPE));

    await act(() => result.current.exportReport("PDF"));

    await waitFor(() => expect(result.current.error).toBe(IN_PROGRESS_MESSAGE));
    expect(result.current.isGenerating).toBe(false);
    expect(downloadFile).not.toHaveBeenCalled();

    // A recusa também libera o bloqueio: a nova tentativa chega ao backend e o aviso antigo some
    service.exportReport.mockResolvedValueOnce(makeExportedFile());
    await act(() => result.current.exportReport("PDF"));
    expect(service.exportReport).toHaveBeenCalledTimes(2);
    expect(downloadFile).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });
});
