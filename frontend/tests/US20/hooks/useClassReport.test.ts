import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useClassReport } from "@/hooks/useClassReport";
import { reportService } from "@/services/reportService";
import {
  FORBIDDEN_MESSAGE,
  makeClassReport,
  makeForbiddenError,
  makeWithdrawnStudentRow,
  ROOM_ID,
} from "../fixtures";

vi.mock("@/services/reportService", () => ({
  reportService: { fetchClassReport: vi.fn() },
}));

const service = vi.mocked(reportService);

describe("[US20] useClassReport", () => {
  it("Deve carregar na montagem o relatório final da sala informada e expô-lo como o service devolveu", async () => {
    const report = makeClassReport({ withdrawnStudents: [makeWithdrawnStudentRow()] });
    service.fetchClassReport.mockResolvedValue(report);

    const { result } = renderHook(() => useClassReport(ROOM_ID));

    expect(result.current.isLoading).toBe(true);
    // Antes da resposta não há relatório: a tela não pode mostrar média nenhuma
    expect(result.current.report).toBeNull();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(service.fetchClassReport).toHaveBeenCalledTimes(1);
    expect(service.fetchClassReport).toHaveBeenCalledWith(ROOM_ID);
    expect(result.current.report).toEqual(report);
    expect(result.current.error).toBeNull();
  });

  it("Deve expor a mensagem e nenhum relatório quando o backend nega o acesso", async () => {
    service.fetchClassReport.mockRejectedValue(makeForbiddenError());

    const { result } = renderHook(() => useClassReport(ROOM_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatch(FORBIDDEN_MESSAGE);
    expect(result.current.report).toBeNull();
  });
});
