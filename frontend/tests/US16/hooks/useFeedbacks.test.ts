import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFeedbacks } from "@/hooks/useFeedbacks";
import { feedbackService } from "@/services/feedbackService";
import type { Feedback } from "@/types/feedback";
import {
  CLASS_SIZE,
  GRADE,
  makeClassIds,
  makeFeedback,
  makeOtherFeedback,
  makeTextRequiredError,
  makeTimeoutError,
  OTHER_STUDENT_ID,
  PROBLEM_ID,
  STUDENT_ID,
  TEXT,
  TEXT_REQUIRED_MESSAGE,
  TIMEOUT_MESSAGE,
} from "../fixtures";

vi.mock("@/services/feedbackService", () => ({
  feedbackService: { sendFeedback: vi.fn(), sendBatchFeedback: vi.fn() },
}));

const service = vi.mocked(feedbackService);

const INPUT = { grade: GRADE, text: TEXT };

// Promessa controlada pelo teste: permite olhar o estado enquanto o lote ainda está em andamento
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("[US16] useFeedbacks", () => {
  it("Deve iniciar sem envio em andamento, sem feedbacks enviados e sem chamar o service", () => {
    const { result } = renderHook(() => useFeedbacks(PROBLEM_ID));

    expect(result.current.isSending).toBe(false);
    expect(result.current.sentFeedbacks).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(service.sendFeedback).not.toHaveBeenCalled();
    expect(service.sendBatchFeedback).not.toHaveBeenCalled();
  });

  it("Deve encaminhar o problema, o aluno, a nota e o texto ao service e guardar o feedback devolvido", async () => {
    service.sendFeedback.mockResolvedValue(makeOtherFeedback());
    const { result } = renderHook(() => useFeedbacks(PROBLEM_ID));

    await act(async () => {
      await result.current.sendToStudent(OTHER_STUDENT_ID, INPUT);
    });

    expect(service.sendFeedback).toHaveBeenCalledTimes(1);
    expect(service.sendFeedback).toHaveBeenCalledWith(PROBLEM_ID, { studentId: OTHER_STUDENT_ID, ...INPUT });
    expect(service.sendBatchFeedback).not.toHaveBeenCalled();
    // O id do feedback não vai no envio: o guardado é o do servidor
    expect(result.current.sentFeedbacks).toEqual([makeOtherFeedback()]);
    expect(result.current.error).toBeNull();
  });

  it("Deve disparar a turma inteira em um único lote, com um item por aluno, e guardar os feedbacks devolvidos", async () => {
    const pending = deferred<Feedback[]>();
    service.sendBatchFeedback.mockReturnValue(pending.promise);
    const classIds = makeClassIds();
    const { result } = renderHook(() => useFeedbacks(PROBLEM_ID));

    act(() => {
      void result.current.sendToClass(classIds, INPUT);
    });

    // Critério de Desempenho: uma chamada só para a sala cheia, sem envio individual em loop
    expect(service.sendBatchFeedback).toHaveBeenCalledTimes(1);
    expect(service.sendFeedback).not.toHaveBeenCalled();
    const [problemId, items] = service.sendBatchFeedback.mock.calls[0];
    expect(problemId).toBe(PROBLEM_ID);
    expect(items).toHaveLength(CLASS_SIZE);
    expect(items).toEqual(classIds.map((studentId) => ({ studentId, ...INPUT })));
    // A tela usa este sinal para impedir um segundo lote enquanto o primeiro não termina
    expect(result.current.isSending).toBe(true);

    const saved = [makeFeedback(), makeOtherFeedback()];
    await act(async () => {
      pending.resolve(saved);
    });

    expect(result.current.isSending).toBe(false);
    expect(result.current.sentFeedbacks).toEqual(saved);
    expect(result.current.error).toBeNull();
  });

  it("Deve expor a mensagem e não guardar nada quando o backend recusa o envio", async () => {
    service.sendFeedback.mockRejectedValue(makeTextRequiredError());
    const { result } = renderHook(() => useFeedbacks(PROBLEM_ID));

    await act(async () => {
      await result.current.sendToStudent(STUDENT_ID, { grade: GRADE, text: "" });
    });

    expect(result.current.error).toMatch(TEXT_REQUIRED_MESSAGE);
    expect(result.current.sentFeedbacks).toEqual([]);
    expect(result.current.isSending).toBe(false);
  });

  it("[QA] Deve expor a mensagem de tempo esgotado e liberar novo envio quando o lote estoura o tempo", async () => {
    service.sendBatchFeedback.mockRejectedValue(makeTimeoutError());
    const { result } = renderHook(() => useFeedbacks(PROBLEM_ID));

    await act(async () => {
      await result.current.sendToClass(makeClassIds(), INPUT);
    });

    expect(result.current.error).toMatch(TIMEOUT_MESSAGE);
    expect(result.current.sentFeedbacks).toEqual([]);
    // Sem isto o tutor ficaria preso sem poder reenviar
    expect(result.current.isSending).toBe(false);
  });

  it("Deve limpar o erro quando o envio seguinte é aceito", async () => {
    service.sendBatchFeedback
      .mockRejectedValueOnce(makeTimeoutError())
      .mockResolvedValueOnce([makeFeedback(), makeOtherFeedback()]);
    const { result } = renderHook(() => useFeedbacks(PROBLEM_ID));

    await act(async () => {
      await result.current.sendToClass([STUDENT_ID, OTHER_STUDENT_ID], INPUT);
    });
    expect(result.current.error).toMatch(TIMEOUT_MESSAGE);

    await act(async () => {
      await result.current.sendToClass([STUDENT_ID, OTHER_STUDENT_ID], INPUT);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.sentFeedbacks).toEqual([makeFeedback(), makeOtherFeedback()]);
  });
});
