import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criteriaPresetService } from "@/services/criteriaPresetService";
import {
    invalidSumText,
    makePreset,
    PAPEL_ID,
    PRESET_DELAY_MS,
    SEGMENTOS_ID,
    uniquePresetId,
} from "../fixtures";

// O service responde pelo mock com atraso simulado: o relógio falso avança sem esperar de verdade
beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

async function settle<T>(promise: Promise<T>): Promise<T> {
    await vi.advanceTimersByTimeAsync(PRESET_DELAY_MS);
    return promise;
}

describe("[US07] criteriaPresetService", () => {
    it("Deve responder só depois do atraso simulado, para a tela poder mostrar o carregamento", async () => {
        let resolved = false;
        void criteriaPresetService.fetchPreset(uniquePresetId()).then(() => {
            resolved = true;
        });

        await vi.advanceTimersByTimeAsync(PRESET_DELAY_MS - 1);
        expect(resolved).toBe(false);

        await vi.advanceTimersByTimeAsync(1);
        expect(resolved).toBe(true);
    });

    it("Deve entregar o pré-set inicial a um problema novo", async () => {
        const preset = await settle(criteriaPresetService.fetchPreset(uniquePresetId()));

        expect(preset).toEqual(makePreset());
    });

    it("Deve devolver uma CÓPIA: mutar o resultado não altera o 'banco'", async () => {
        const presetId = uniquePresetId();
        const first = await settle(criteriaPresetService.fetchPreset(presetId));

        // A tela edita a lista em memória e só grava em "Salvar Pre-set"
        first[0].weight = 99;
        first.push({ id: "extra", name: "Extra", weight: 1, isRemovable: true });
        const second = await settle(criteriaPresetService.fetchPreset(presetId));

        expect(second).toEqual(makePreset());
    });

    it("Deve persistir o pré-set salvo apenas para o presetId informado", async () => {
        const presetId = uniquePresetId();
        const otherPresetId = uniquePresetId();
        const edited = makePreset().map((c) =>
            c.id === SEGMENTOS_ID ? { ...c, name: "Pesquisa", weight: 20 } : c.id === PAPEL_ID ? { ...c, weight: 30 } : c,
        );

        const saved = await settle(criteriaPresetService.savePreset(presetId, edited));

        expect(saved).toEqual(edited);
        expect(await settle(criteriaPresetService.fetchPreset(presetId))).toEqual(edited);
        // Outro problema continua com o pré-set inicial
        expect(await settle(criteriaPresetService.fetchPreset(otherPresetId))).toEqual(makePreset());
    });

    it("Deve rejeitar com a mensagem de soma e não gravar nada quando os pesos não somam 100%", async () => {
        const presetId = uniquePresetId();
        const ninetyNine = makePreset().map((c) => (c.id === PAPEL_ID ? { ...c, weight: 24 } : c));

        // Registrada antes de avançar o relógio, para a rejeição não ficar sem tratamento
        const outcome = expect(criteriaPresetService.savePreset(presetId, ninetyNine)).rejects.toThrow(invalidSumText(99));
        await vi.advanceTimersByTimeAsync(PRESET_DELAY_MS);
        await outcome;

        expect(await settle(criteriaPresetService.fetchPreset(presetId))).toEqual(makePreset());
    });
});