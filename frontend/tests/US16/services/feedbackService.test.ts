import { beforeEach, describe, expect, it, vi } from "vitest";
import { feedbackService } from "@/services/feedbackService";
import {
  BACKEND_FORBIDDEN_BODY,
  FORBIDDEN_MESSAGE,
  GRADE,
  makeFeedback,
  makeOtherFeedback,
  OTHER_STUDENT_ID,
  PROBLEM_ID,
  STUDENT_ID,
  TEXT,
  TEXT_REQUIRED_MESSAGE,
  TEXT_REQUIRED_TEXT,
  TIMEOUT_MESSAGE,
} from "../fixtures";

const FEEDBACKS_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}/feedbacks$`);
const BATCH_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}/feedbacks/batch$`);

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

describe("[US16] feedbackService", () => {
  it("Deve fazer POST do aluno, da nota e do texto na rota de feedbacks do problema e devolver o feedback do servidor", async () => {
    const saved = makeFeedback();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(saved, 201));

    await expect(
      feedbackService.sendFeedback(PROBLEM_ID, { studentId: STUDENT_ID, grade: GRADE, text: TEXT }),
    ).resolves.toEqual(saved);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(FEEDBACKS_ROUTE);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    // O tutor vem do token, não do corpo
    expect(sentBody(init)).toEqual({ studentId: STUDENT_ID, grade: GRADE, text: TEXT });
  });

  it("Deve enviar o lote em uma única requisição POST na rota de lote e devolver um feedback por aluno", async () => {
    const saved = [makeFeedback(), makeOtherFeedback()];
    vi.mocked(fetch).mockResolvedValue(jsonResponse(saved, 201));
    const items = [
      { studentId: STUDENT_ID, grade: GRADE, text: TEXT },
      { studentId: OTHER_STUDENT_ID, grade: GRADE, text: TEXT },
    ];

    await expect(feedbackService.sendBatchFeedback(PROBLEM_ID, items)).resolves.toEqual(saved);

    // Critério de Desempenho: o lote é um disparo só, nunca uma requisição por aluno
    const { url, init } = singleFetchCall();
    expect(url).toMatch(BATCH_ROUTE);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ feedbacks: items });
  });

  it("Deve rejeitar com 400 e a mensagem em português do campo quando o backend recusa a validação", async () => {
    // O "message" do Bean Validation é genérico em inglês; a mensagem útil está em errors
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { status: 400, error: "Bad Request", message: "Validation failed", errors: { text: TEXT_REQUIRED_TEXT } },
        400,
      ),
    );

    await expect(feedbackService.sendFeedback(PROBLEM_ID, { studentId: STUDENT_ID, grade: GRADE, text: "" }))
      .rejects.toEqual({ status: 400, message: expect.stringMatching(TEXT_REQUIRED_MESSAGE) });
    singleFetchCall();
  });

  it("Deve rejeitar com 403 e a mensagem em português quando o backend recusa o envio", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(BACKEND_FORBIDDEN_BODY, 403));

    await expect(feedbackService.sendFeedback(PROBLEM_ID, { studentId: STUDENT_ID, grade: 10, text: "Quero enviar" }))
      .rejects.toEqual({ status: 403, message: expect.stringMatching(FORBIDDEN_MESSAGE) });
    singleFetchCall();
  });

  it("[QA] Deve rejeitar com 504 e a mensagem de tempo esgotado quando o lote estoura o tempo da API", async () => {
    // O gateway devolve HTML, não JSON
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html><body>504 Gateway Time-out</body></html>", {
        status: 504,
        headers: { "Content-Type": "text/html" },
      }),
    );

    await expect(
      feedbackService.sendBatchFeedback(PROBLEM_ID, [{ studentId: STUDENT_ID, grade: GRADE, text: TEXT }]),
    ).rejects.toEqual({ status: 504, message: expect.stringMatching(TIMEOUT_MESSAGE) });
    singleFetchCall();
  });
});
