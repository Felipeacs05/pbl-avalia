import { beforeEach, describe, expect, it, vi } from "vitest";
import { feedbackService } from "@/services/feedbackService";
import {
  BACKEND_FORBIDDEN_BODY,
  FORBIDDEN_MESSAGE,
  makeOlderStudentFeedback,
  makePage,
  makeStudentFeedback,
  OTHER_STUDENT_ID,
  STUDENT_ID,
} from "../fixtures";

const STUDENT_FEEDBACKS_ROUTE = new RegExp(`/api/v1/students/${STUDENT_ID}/feedbacks$`);

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

describe("[US17] feedbackService", () => {
  it("Deve buscar com GET os feedbacks do aluno informado e devolver o conteúdo da página na ordem do backend", async () => {
    const feedbacks = [makeStudentFeedback(), makeOlderStudentFeedback()];
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makePage(feedbacks), 200));

    await expect(feedbackService.fetchStudentFeedbacks(STUDENT_ID)).resolves.toEqual(feedbacks);

    const { url, init } = singleFetchCall();
    // Só a primeira página: sem page/size, o backend aplica o padrão
    expect(url).toMatch(STUDENT_FEEDBACKS_ROUTE);
    expect(init.method ?? "GET").toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("Deve devolver uma lista vazia quando o aluno ainda não tem feedbacks", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makePage([]), 200));

    await expect(feedbackService.fetchStudentFeedbacks(STUDENT_ID)).resolves.toEqual([]);
    singleFetchCall();
  });

  it("[QA] Deve rejeitar com 403 e a mensagem em português quando o backend nega o feedback de outro aluno", async () => {
    // O @PreAuthorize nega e o handler devolve JSON com mensagem genérica em inglês
    vi.mocked(fetch).mockResolvedValue(jsonResponse(BACKEND_FORBIDDEN_BODY, 403));

    await expect(feedbackService.fetchStudentFeedbacks(OTHER_STUDENT_ID))
      .rejects.toEqual({ status: 403, message: expect.stringMatching(FORBIDDEN_MESSAGE) });

    const { url } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/students/${OTHER_STUDENT_ID}/feedbacks$`));
  });
});
