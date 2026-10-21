import { beforeEach, describe, expect, it, vi } from "vitest";
import { gradeAdjustmentService } from "@/services/gradeAdjustmentService";
import {
  ADJUSTED_GRADE,
  ASSESSMENT_ID,
  BACKEND_FORBIDDEN_BODY,
  FORBIDDEN_MESSAGE,
  JUSTIFICATION,
  makeGradeAdjustment,
} from "../fixtures";

const GRADE_ADJUSTMENT_ROUTE = new RegExp(`/api/v1/assessments/${ASSESSMENT_ID}/grade-adjustment$`);

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

function sentBody(init: RequestInit): unknown {
  return JSON.parse(String(init.body));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("[US15] gradeAdjustmentService", () => {
  it("Deve fazer PATCH da nota ajustada e da justificativa na rota da avaliação e devolver o ajuste do servidor", async () => {
    const adjustment = makeGradeAdjustment();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(adjustment, 200));

    await expect(
      gradeAdjustmentService.adjustGrade(ASSESSMENT_ID, { adjustedGrade: ADJUSTED_GRADE, justification: JUSTIFICATION }),
    ).resolves.toEqual(adjustment);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(GRADE_ADJUSTMENT_ROUTE);
    expect(init.method).toBe("PATCH");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    // A nota trafega como número (Double no backend); o tutor vem do token, não do corpo
    expect(sentBody(init)).toEqual({ adjustedGrade: ADJUSTED_GRADE, justification: JUSTIFICATION });
  });

  it("Deve rejeitar com 403 e a mensagem em português quando o backend recusa o ajuste", async () => {
    // O handler de AccessDeniedException devolve JSON com mensagem genérica em inglês
    vi.mocked(fetch).mockResolvedValue(jsonResponse(BACKEND_FORBIDDEN_BODY, 403));

    await expect(
      gradeAdjustmentService.adjustGrade(ASSESSMENT_ID, { adjustedGrade: 10, justification: "Quero nota máxima" }),
    ).rejects.toEqual({ status: 403, message: expect.stringMatching(FORBIDDEN_MESSAGE) });
    singleFetchCall();
  });
});
