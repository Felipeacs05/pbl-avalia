import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStudentFeedbacks } from "@/hooks/useStudentFeedbacks";
import { feedbackService } from "@/services/feedbackService";
import {
  FORBIDDEN_MESSAGE,
  makeForbiddenError,
  makeOlderStudentFeedback,
  makeStudentFeedback,
  OTHER_STUDENT_ID,
  STUDENT_ID,
} from "../fixtures";

vi.mock("@/services/feedbackService", () => ({
  feedbackService: { fetchStudentFeedbacks: vi.fn() },
}));

const service = vi.mocked(feedbackService);

describe("[US17] useStudentFeedbacks", () => {
  it("Deve carregar na montagem os feedbacks do aluno informado, mantendo a ordem do backend", async () => {
    service.fetchStudentFeedbacks.mockResolvedValue([makeStudentFeedback(), makeOlderStudentFeedback()]);

    const { result } = renderHook(() => useStudentFeedbacks(STUDENT_ID));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(service.fetchStudentFeedbacks).toHaveBeenCalledTimes(1);
    expect(service.fetchStudentFeedbacks).toHaveBeenCalledWith(STUDENT_ID);
    expect(result.current.feedbacks).toEqual([makeStudentFeedback(), makeOlderStudentFeedback()]);
    expect(result.current.error).toBeNull();
  });

  it("Deve expor uma lista vazia, sem erro, quando o aluno ainda não tem feedbacks", async () => {
    service.fetchStudentFeedbacks.mockResolvedValue([]);

    const { result } = renderHook(() => useStudentFeedbacks(STUDENT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.feedbacks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("[QA] Deve expor a mensagem e nenhum feedback quando o backend nega o acesso", async () => {
    service.fetchStudentFeedbacks.mockRejectedValue(makeForbiddenError());

    const { result } = renderHook(() => useStudentFeedbacks(OTHER_STUDENT_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatch(FORBIDDEN_MESSAGE);
    expect(result.current.feedbacks).toEqual([]);
  });

  it("[QA] Deve descartar os feedbacks já exibidos quando a busca de outro aluno é negada", async () => {
    service.fetchStudentFeedbacks
      .mockResolvedValueOnce([makeStudentFeedback()])
      .mockRejectedValueOnce(makeForbiddenError());

    const { result, rerender } = renderHook(({ studentId }) => useStudentFeedbacks(studentId), {
      initialProps: { studentId: STUDENT_ID },
    });
    await waitFor(() => expect(result.current.feedbacks).toEqual([makeStudentFeedback()]));

    // Troca do id na URL: a lista anterior não pode continuar na tela sob o novo id
    rerender({ studentId: OTHER_STUDENT_ID });

    await waitFor(() => expect(result.current.error).toMatch(FORBIDDEN_MESSAGE));
    expect(service.fetchStudentFeedbacks).toHaveBeenLastCalledWith(OTHER_STUDENT_ID);
    expect(result.current.feedbacks).toEqual([]);
  });
});
