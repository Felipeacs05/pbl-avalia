import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useEvaluationManager } from "@/hooks/useEvaluationManager";
import { evaluationService } from "@/services/evaluationService";
import type { EvaluationStatus } from "@/types/evaluation";
import {
    makeEvaluationStatus,
    makeReleasedStatus,
    makeServerError,
    PROBLEM_ID,
    SERVER_ERROR_MESSAGE,
} from "../fixtures";

vi.mock("@/services/evaluationService", () => ({
    evaluationService: { getEvaluationStatus: vi.fn(), releaseEvaluation: vi.fn() },
}));

const service = vi.mocked(evaluationService);

// Promessa controlada pelo teste: permite olhar o estado enquanto a liberação está pendente
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function renderLoadedHook(initial: EvaluationStatus = makeEvaluationStatus()) {
    service.getEvaluationStatus.mockResolvedValue(initial);
    const hook = renderHook(() => useEvaluationManager(PROBLEM_ID));
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    return hook;
}

describe("[US12] useEvaluationManager", () => {
    it("Deve carregar o status do problema na montagem e partir com o modal fechado", async () => {
        service.getEvaluationStatus.mockResolvedValue(makeReleasedStatus("self_evaluation"));

        const { result } = renderHook(() => useEvaluationManager(PROBLEM_ID));

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(service.getEvaluationStatus).toHaveBeenCalledWith(PROBLEM_ID);
        expect(result.current.evaluationStatus).toEqual(makeReleasedStatus("self_evaluation"));
        // A seleção do modal começa igual ao que já está liberado
        expect(result.current.selectedType).toBe("self_evaluation");
        expect(result.current.isModalOpen).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("Deve expor o erro quando o status não carrega", async () => {
        service.getEvaluationStatus.mockRejectedValue(new Error("Falha ao carregar"));

        const { result } = renderHook(() => useEvaluationManager(PROBLEM_ID));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Falha ao carregar");
        expect(result.current.evaluationStatus.isReleased).toBe(false);
    });

    it("Deve alternar o tipo selecionado e voltar a null ao tocar o mesmo tipo de novo", async () => {
        const { result } = await renderLoadedHook();

        act(() => result.current.toggleType("self_evaluation"));
        expect(result.current.selectedType).toBe("self_evaluation");

        act(() => result.current.toggleType("self_evaluation"));
        expect(result.current.selectedType).toBeNull();
    });

    it("Deve trocar a seleção ao tocar o outro tipo", async () => {
        const { result } = await renderLoadedHook();

        act(() => result.current.toggleType("self_evaluation"));
        act(() => result.current.toggleType("peer_evaluation"));

        expect(result.current.selectedType).toBe("peer_evaluation");
    });

    it("Deve sincronizar a seleção com o tipo ativo ao abrir o modal, descartando mudanças não confirmadas", async () => {
        const { result } = await renderLoadedHook(makeReleasedStatus("self_evaluation"));

        act(() => result.current.toggleType("peer_evaluation"));
        act(() => result.current.closeModal());
        act(() => result.current.openModal());

        // Quem fechou sem confirmar não pode reabrir vendo uma escolha que nunca foi gravada
        expect(result.current.isModalOpen).toBe(true);
        expect(result.current.selectedType).toBe("self_evaluation");
    });

    it("Deve enviar o tipo escolhido, atualizar o status e fechar o modal quando a liberação é aceita", async () => {
        service.releaseEvaluation.mockResolvedValue(makeReleasedStatus("self_evaluation"));
        const { result } = await renderLoadedHook();
        act(() => result.current.openModal());
        act(() => result.current.toggleType("self_evaluation"));

        let returned: EvaluationStatus | null = null;
        await act(async () => {
            returned = await result.current.confirmRelease();
        });

        expect(service.releaseEvaluation).toHaveBeenCalledTimes(1);
        expect(service.releaseEvaluation).toHaveBeenCalledWith(PROBLEM_ID, "self_evaluation");
        expect(returned).toEqual(makeReleasedStatus("self_evaluation"));
        expect(result.current.evaluationStatus).toEqual(makeReleasedStatus("self_evaluation"));
        expect(result.current.isModalOpen).toBe(false);
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("Deve enviar null para desativar a liberação quando nenhum tipo está selecionado", async () => {
        service.releaseEvaluation.mockResolvedValue(makeEvaluationStatus());
        const { result } = await renderLoadedHook(makeReleasedStatus("self_evaluation"));
        act(() => result.current.openModal());
        act(() => result.current.toggleType("self_evaluation"));

        await act(async () => {
            await result.current.confirmRelease();
        });

        expect(service.releaseEvaluation).toHaveBeenCalledWith(PROBLEM_ID, null);
        expect(result.current.evaluationStatus.isReleased).toBe(false);
    });

    it("Deve manter o status anterior, o modal aberto e expor o erro quando a liberação falha", async () => {
        service.releaseEvaluation.mockRejectedValue(new Error("Falha ao liberar"));
        const { result } = await renderLoadedHook();
        act(() => result.current.openModal());
        act(() => result.current.toggleType("self_evaluation"));

        let returned: EvaluationStatus | null = makeEvaluationStatus();
        await act(async () => {
            returned = await result.current.confirmRelease();
        });

        expect(returned).toBeNull();
        expect(result.current.error).toBe("Falha ao liberar");
        // Nada foi gravado: a tela não pode mostrar como liberado o que o servidor recusou
        expect(result.current.evaluationStatus).toEqual(makeEvaluationStatus());
        expect(result.current.isModalOpen).toBe(true);
        expect(result.current.isSubmitting).toBe(false);
    });

    it("[QA] Deve expor a mensagem do contrato { status, message } quando o service recusa a liberação", async () => {
        service.releaseEvaluation.mockRejectedValue(makeServerError());
        const { result } = await renderLoadedHook();
        act(() => result.current.toggleType("self_evaluation"));

        await act(async () => {
            await result.current.confirmRelease();
        });

        // Os outros hooks do projeto leem message de objetos { status, message }
        expect(result.current.error).toMatch(SERVER_ERROR_MESSAGE);
        expect(result.current.evaluationStatus).toEqual(makeEvaluationStatus());
    });

    it("[QA] Deve enviar os dois tipos quando a autoavaliação e a avaliação entre pares são liberadas juntas", async () => {
        service.releaseEvaluation.mockResolvedValue(makeReleasedStatus("peer_evaluation"));
        const { result } = await renderLoadedHook();
        act(() => result.current.openModal());
        act(() => result.current.toggleType("self_evaluation"));
        act(() => result.current.toggleType("peer_evaluation"));

        await act(async () => {
            await result.current.confirmRelease();
        });

        // Pelo PRD as duas liberações são independentes: escolher pares não pode apagar a autoavaliação
        const sentTypes = service.releaseEvaluation.mock.calls.map(([, type]) => type);
        expect(sentTypes).toEqual(expect.arrayContaining(["self_evaluation", "peer_evaluation"]));
    });

    it("Deve terminar no estado da última resposta quando 3 confirmações rápidas chegam em ordem", async () => {
        const first = deferred<EvaluationStatus>();
        const second = deferred<EvaluationStatus>();
        const third = deferred<EvaluationStatus>();
        service.releaseEvaluation
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise)
            .mockReturnValueOnce(third.promise);
        const { result } = await renderLoadedHook();

        // 3 cliques no mesmo instante, antes de qualquer resposta
        act(() => {
            void result.current.confirmRelease();
            void result.current.confirmRelease();
            void result.current.confirmRelease();
        });
        expect(service.releaseEvaluation).toHaveBeenCalledTimes(3);

        await act(async () => {
            first.resolve(makeReleasedStatus("self_evaluation"));
            second.resolve(makeEvaluationStatus());
            third.resolve(makeReleasedStatus("self_evaluation"));
        });

        expect(result.current.evaluationStatus).toEqual(makeReleasedStatus("self_evaluation"));
        expect(result.current.isSubmitting).toBe(false);
    });

    it("[QA] Deve manter o estado do último clique quando as respostas chegam fora de ordem", async () => {
        const first = deferred<EvaluationStatus>();
        const second = deferred<EvaluationStatus>();
        const third = deferred<EvaluationStatus>();
        service.releaseEvaluation
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise)
            .mockReturnValueOnce(third.promise);
        const { result } = await renderLoadedHook();

        act(() => {
            void result.current.confirmRelease();
            void result.current.confirmRelease();
            void result.current.confirmRelease();
        });

        // A resposta do 3º clique chega antes das outras: o plano pede que o último estado pedido prevaleça
        await act(async () => {
            third.resolve(makeReleasedStatus("peer_evaluation"));
            first.resolve(makeReleasedStatus("self_evaluation"));
            second.resolve(makeEvaluationStatus());
        });

        expect(result.current.evaluationStatus).toEqual(makeReleasedStatus("peer_evaluation"));
    });
});