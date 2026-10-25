import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCriteriaPreset } from "@/hooks/useCriteriaPreset";
import { criteriaPresetService } from "@/services/criteriaPresetService";
import type { PresetCriterion } from "@/types/performanceTable";
import {
    AUTOAVALIACAO_ID,
    COMPORTAMENTO_ID,
    invalidSumText,
    LOAD_ERROR_MESSAGE,
    makePreset,
    PAPEL_ID,
    PRESET_PROBLEM_ID,
    SAVE_GENERIC_ERROR_MESSAGE,
    SAVED_MESSAGE,
    SEGMENTOS_ID,
} from "../fixtures";

vi.mock("@/services/criteriaPresetService", () => ({
    criteriaPresetService: { fetchPreset: vi.fn(), savePreset: vi.fn() },
}));

const service = vi.mocked(criteriaPresetService);

// Promessa controlada pelo teste: permite olhar o estado enquanto o salvamento está pendente
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
    service.fetchPreset.mockResolvedValue(makePreset());
    const hook = renderHook(() => useCriteriaPreset(PRESET_PROBLEM_ID));
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    return hook;
}

describe("[US07] useCriteriaPreset", () => {
    // --- CARREGAMENTO ---

    it("Deve carregar na montagem o pré-set do problema informado, sem mudanças pendentes", async () => {
        service.fetchPreset.mockResolvedValue(makePreset());

        const { result } = renderHook(() => useCriteriaPreset(PRESET_PROBLEM_ID));

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(service.fetchPreset).toHaveBeenCalledTimes(1);
        expect(service.fetchPreset).toHaveBeenCalledWith(PRESET_PROBLEM_ID);
        expect(result.current.criteria).toEqual(makePreset());
        expect(result.current.hasChanges).toBe(false);
        expect(result.current.toast).toBeNull();
        expect(service.savePreset).not.toHaveBeenCalled();
    });

    it("Deve avisar em toast de erro e terminar o carregamento quando a busca falha", async () => {
        service.fetchPreset.mockRejectedValue(new Error("falha de rede"));

        const { result } = renderHook(() => useCriteriaPreset(PRESET_PROBLEM_ID));

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.toast).toEqual({ type: "error", message: LOAD_ERROR_MESSAGE });
        expect(result.current.criteria).toEqual([]);
    });

    // --- ADICIONAR ---

    it("Deve adicionar o critério como opcional, com id local, só no estado da tela e sem chamar o service", async () => {
        const { result } = await renderLoadedHook();

        act(() => {
            result.current.addCriterion({ name: "Pesquisa", weight: 10 });
        });

        // SPA: a lista muda na hora e nada vai ao backend até "Salvar Pre-set"
        expect(result.current.criteria).toHaveLength(7);
        const added = result.current.criteria[6];
        expect(added).toMatchObject({ name: "Pesquisa", weight: 10, isRemovable: true });
        expect(added.id).toMatch(/^crit_new_/);
        expect(added.isToggle).toBeUndefined();
        expect(result.current.hasChanges).toBe(true);
        expect(service.savePreset).not.toHaveBeenCalled();
    });

    it("Deve gerar um id local único para cada critério adicionado, mesmo em sequência no mesmo instante", async () => {
        const { result } = await renderLoadedHook();

        act(() => {
            for (let i = 1; i <= 15; i++) result.current.addCriterion({ name: `Critério ${i}`, weight: 0 });
        });

        // Ids repetidos fariam a edição ou a remoção atingir o critério errado
        const ids = result.current.criteria.map((criterion) => criterion.id);
        expect(ids).toHaveLength(6 + 15);
        expect(new Set(ids).size).toBe(ids.length);
    });

    // --- EDITAR ---

    it("Deve atualizar só o nome e o peso do critério escolhido", async () => {
        const { result } = await renderLoadedHook();

        act(() => {
            result.current.updateCriterion(SEGMENTOS_ID, { name: "Pesquisa", weight: 10 });
        });

        expect(result.current.criteria.find((c) => c.id === SEGMENTOS_ID)).toEqual({
            id: SEGMENTOS_ID,
            name: "Pesquisa",
            weight: 10,
            isRemovable: true,
        });
        // Os demais critérios seguem intactos
        const others = result.current.criteria.filter((c) => c.id !== SEGMENTOS_ID);
        expect(others).toEqual(makePreset().filter((c) => c.id !== SEGMENTOS_ID));
        expect(result.current.hasChanges).toBe(true);
    });

    it("Deve alternar o toggle de Auto Avaliação sem mexer nos pesos", async () => {
        const { result } = await renderLoadedHook();

        act(() => {
            result.current.toggleCriterion(AUTOAVALIACAO_ID);
        });

        expect(result.current.criteria.find((c) => c.id === AUTOAVALIACAO_ID)?.enabled).toBe(false);
        expect(result.current.criteria.filter((c) => !c.isToggle).map((c) => c.weight)).toEqual([25, 25, 25, 25]);
        expect(result.current.hasChanges).toBe(true);
    });

    // --- REMOVER ---

    it("Deve remover o critério opcional da lista", async () => {
        const { result } = await renderLoadedHook();

        act(() => {
            result.current.removeCriterion(COMPORTAMENTO_ID);
        });

        expect(result.current.criteria.map((c) => c.id)).not.toContain(COMPORTAMENTO_ID);
        expect(result.current.criteria).toHaveLength(5);
        expect(result.current.hasChanges).toBe(true);
    });

    it("Deve manter os critérios fixos e os toggles mesmo quando removeCriterion é chamado direto", async () => {
        const { result } = await renderLoadedHook();

        act(() => {
            result.current.removeCriterion(PAPEL_ID);
            result.current.removeCriterion(AUTOAVALIACAO_ID);
        });

        // Proteção extra: a lixeira some da tela, mas a regra não pode depender só da interface
        expect(result.current.criteria).toEqual(makePreset());
    });

    // --- SALVAR ---

    it("Deve sinalizar o salvamento e enviar ao service o id do pré-set e a lista atual", async () => {
        const pending = deferred<PresetCriterion[]>();
        service.savePreset.mockReturnValue(pending.promise);
        const { result } = await renderLoadedHook();
        act(() => {
            result.current.addCriterion({ name: "Pesquisa", weight: 0 });
        });

        let outcome: Promise<boolean> = Promise.resolve(false);
        act(() => {
            outcome = result.current.savePreset();
        });

        expect(result.current.isSaving).toBe(true);
        expect(service.savePreset).toHaveBeenCalledWith(
            PRESET_PROBLEM_ID,
            expect.arrayContaining([expect.objectContaining({ name: "Pesquisa", weight: 0 })]),
        );

        await act(async () => {
            pending.resolve(makePreset());
        });

        await expect(outcome).resolves.toBe(true);
        expect(result.current.isSaving).toBe(false);
    });

    it("Deve guardar a lista devolvida pelo service, zerar hasChanges e avisar o sucesso", async () => {
        const saved = makePreset().map((c) => (c.id === SEGMENTOS_ID ? { ...c, name: "Segmentos (servidor)" } : c));
        service.savePreset.mockResolvedValue(saved);
        const { result } = await renderLoadedHook();
        act(() => {
            result.current.updateCriterion(SEGMENTOS_ID, { name: "Segmentos", weight: 25 });
        });
        expect(result.current.hasChanges).toBe(true);

        let ok = false;
        await act(async () => {
            ok = await result.current.savePreset();
        });

        // true avisa a tela que pode seguir (ex.: ir para o problema)
        expect(ok).toBe(true);
        // A tela passa a mostrar o que o servidor gravou, e não o que foi digitado
        expect(result.current.criteria).toEqual(saved);
        expect(result.current.hasChanges).toBe(false);
        expect(result.current.toast).toEqual({ type: "success", message: SAVED_MESSAGE });
    });

    it("Deve devolver false, mostrar a recusa do backend e manter as alterações quando o salvamento falha", async () => {
        service.savePreset.mockRejectedValue(new Error(invalidSumText(105)));
        const { result } = await renderLoadedHook();
        act(() => {
            result.current.addCriterion({ name: "Pesquisa", weight: 5 });
        });

        let ok = true;
        await act(async () => {
            ok = await result.current.savePreset();
        });

        expect(ok).toBe(false);
        expect(result.current.toast).toEqual({ type: "error", message: invalidSumText(105) });
        // O tutor não perde o que digitou e pode corrigir os pesos
        expect(result.current.hasChanges).toBe(true);
        expect(result.current.criteria).toHaveLength(7);
        expect(result.current.isSaving).toBe(false);
    });

    it("Deve usar a mensagem genérica quando a falha não traz mensagem", async () => {
        service.savePreset.mockRejectedValue({ status: 500 });
        const { result } = await renderLoadedHook();

        await act(async () => {
            await result.current.savePreset();
        });

        expect(result.current.toast).toEqual({ type: "error", message: SAVE_GENERIC_ERROR_MESSAGE });
    });

    it("Deve limpar o toast em clearToast", async () => {
        service.savePreset.mockResolvedValue(makePreset());
        const { result } = await renderLoadedHook();
        await act(async () => {
            await result.current.savePreset();
        });
        expect(result.current.toast).not.toBeNull();

        act(() => {
            result.current.clearToast();
        });

        expect(result.current.toast).toBeNull();
    });
});