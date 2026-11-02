import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useBehaviorRecords } from "@/hooks/useBehaviorRecords";
import { behaviorRecordService } from "@/services/behaviorRecordService";
import type { BehaviorRecord } from "@/types/behaviorRecord";
import {
  FORBIDDEN_MESSAGE,
  FREE_TEXT,
  makeForbiddenError,
  makeOtherTag,
  makeRecord,
  makeTag,
  makeTextRecord,
  SESSION_ID,
  STUDENT_ID,
  TAG_ID,
} from "../fixtures";

vi.mock("@/services/behaviorRecordService", () => ({
  behaviorRecordService: { fetchBehaviorTags: vi.fn(), createBehaviorRecord: vi.fn() },
}));

const service = vi.mocked(behaviorRecordService);

// Promessa controlada pelo teste: permite olhar o estado enquanto o salvamento ainda está em andamento
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function renderLoadedHook() {
  service.fetchBehaviorTags.mockResolvedValue([makeTag(), makeOtherTag()]);
  const hook = renderHook(() => useBehaviorRecords(SESSION_ID));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe("[US11] useBehaviorRecords", () => {
  it("Deve carregar as tags predefinidas na montagem, sem registrar nada", async () => {
    service.fetchBehaviorTags.mockResolvedValue([makeTag(), makeOtherTag()]);

    const { result } = renderHook(() => useBehaviorRecords(SESSION_ID));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tags).toEqual([makeTag(), makeOtherTag()]);
    expect(service.fetchBehaviorTags).toHaveBeenCalledTimes(1);
    expect(service.createBehaviorRecord).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastRecord).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("Deve encaminhar sessão, aluno e tag ao service, sinalizar o salvamento e guardar o registro devolvido", async () => {
    const pending = deferred<BehaviorRecord>();
    service.createBehaviorRecord.mockReturnValue(pending.promise);
    const { result } = await renderLoadedHook();

    let saved: Promise<boolean> = Promise.resolve(false);
    act(() => {
      saved = result.current.registerBehavior(STUDENT_ID, { tagId: TAG_ID });
    });

    expect(service.createBehaviorRecord).toHaveBeenCalledTimes(1);
    expect(service.createBehaviorRecord).toHaveBeenCalledWith(SESSION_ID, STUDENT_ID, { tagId: TAG_ID });
    // O painel usa este sinal para impedir um segundo toque enquanto a requisição está pendente
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      pending.resolve(makeRecord());
    });

    // true avisa a tela que pode fechar o painel
    await expect(saved).resolves.toBe(true);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastRecord).toEqual(makeRecord());
    expect(result.current.error).toBeNull();
  });

  it("Deve encaminhar o texto livre ao service e guardar o registro devolvido", async () => {
    service.createBehaviorRecord.mockResolvedValue(makeTextRecord());
    const { result } = await renderLoadedHook();

    let saved = false;
    await act(async () => {
      saved = await result.current.registerBehavior(STUDENT_ID, { text: FREE_TEXT });
    });

    expect(service.createBehaviorRecord).toHaveBeenCalledWith(SESSION_ID, STUDENT_ID, { text: FREE_TEXT });
    expect(saved).toBe(true);
    expect(result.current.lastRecord).toEqual(makeTextRecord());
  });

  it("Deve devolver false e expor a mensagem do backend quando o registro é recusado com 403", async () => {
    service.createBehaviorRecord.mockRejectedValue(makeForbiddenError());
    const { result } = await renderLoadedHook();

    let saved = true;
    await act(async () => {
      saved = await result.current.registerBehavior(STUDENT_ID, { tagId: TAG_ID });
    });

    // false mantém o painel aberto para o tutor ver o erro
    expect(saved).toBe(false);
    expect(result.current.error).toMatch(FORBIDDEN_MESSAGE);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.lastRecord).toBeNull();
    // As tags continuam disponíveis para uma nova tentativa
    expect(result.current.tags).toEqual([makeTag(), makeOtherTag()]);
  });

  it("Deve limpar o erro quando o registro seguinte é salvo", async () => {
    service.createBehaviorRecord
      .mockRejectedValueOnce(makeForbiddenError())
      .mockResolvedValueOnce(makeRecord());
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.registerBehavior(STUDENT_ID, { tagId: TAG_ID });
    });
    expect(result.current.error).toMatch(FORBIDDEN_MESSAGE);

    await act(async () => {
      await result.current.registerBehavior(STUDENT_ID, { tagId: TAG_ID });
    });

    expect(result.current.error).toBeNull();
    expect(result.current.lastRecord).toEqual(makeRecord());
  });
});
