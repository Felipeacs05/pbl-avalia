import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportService } from "@/services/reportService";
import {
  BACKEND_FORBIDDEN_BODY,
  FORBIDDEN_MESSAGE,
  makeClassReport,
  makeInvalidWeightWarning,
  makeOpenProblem,
  makeOtherProblem,
  makeProblem,
  makeWithdrawnStudentRow,
  OPEN_PROBLEM_ID,
  ROOM_ID,
} from "../fixtures";

const FINAL_REPORT_ROUTE = new RegExp(`/api/v1/rooms/${ROOM_ID}/reports/final$`);

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function singleFetchCall() {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init ?? {} };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("[US20] reportService", () => {
  it("Deve buscar com GET o relatório final da sala e devolver todos os campos do ClassReportResponse", async () => {
    // Todos os campos preenchidos: o service não pode descartar desistentes, avisos nem problemas abertos
    const report = makeClassReport({
      problems: [makeProblem(), makeOtherProblem(), makeOpenProblem()],
      openProblemIds: [OPEN_PROBLEM_ID],
      withdrawnStudents: [makeWithdrawnStudentRow()],
      warnings: [makeInvalidWeightWarning()],
    });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(report, 200));

    await expect(reportService.fetchClassReport(ROOM_ID)).resolves.toEqual(report);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(FINAL_REPORT_ROUTE);
    expect(init.method ?? "GET").toBe("GET");
    // O tutor vem do token, não da requisição
    expect(init.body).toBeUndefined();
  });

  it("Deve rejeitar com 403 e a mensagem em português quando quem pede não é o tutor da sala", async () => {
    // O @PreAuthorize nega e o handler devolve JSON com mensagem genérica em inglês
    vi.mocked(fetch).mockResolvedValue(jsonResponse(BACKEND_FORBIDDEN_BODY, 403));

    await expect(reportService.fetchClassReport(ROOM_ID))
      .rejects.toEqual({ status: 403, message: expect.stringMatching(FORBIDDEN_MESSAGE) });
    singleFetchCall();
  });
});
