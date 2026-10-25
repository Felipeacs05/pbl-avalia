import { describe, expect, it } from "vitest";
import { criteriaPresetMock } from "@/mocks/criteriaPreset.mock";
import { invalidSumText, makePreset, PAPEL_ID, SEGMENTOS_ID, uniquePresetId } from "../fixtures";

describe("[US07] criteriaPresetMock", () => {
    it("Deve nascer com os 6 critérios iniciais do Figma, somando 100% sem contar os toggles", () => {
        const preset = criteriaPresetMock.getPreset(uniquePresetId());

        expect(preset).toEqual(makePreset());
        const weighted = preset.filter((c) => !c.isToggle);
        expect(weighted.reduce((sum, c) => sum + c.weight, 0)).toBe(100);
        // Papel é o único fixo entre os que têm peso
        expect(weighted.filter((c) => !c.isRemovable).map((c) => c.id)).toEqual([PAPEL_ID]);
    });

    it("Deve devolver objetos novos a cada chamada, sem compartilhar referência com o 'banco'", () => {
        const presetId = uniquePresetId();

        const first = criteriaPresetMock.getPreset(presetId);
        const second = criteriaPresetMock.getPreset(presetId);
        first[0].weight = 99;
        first.pop();

        expect(second[0]).not.toBe(first[0]);
        expect(criteriaPresetMock.getPreset(presetId)).toEqual(makePreset());
    });

    it("Deve guardar o pré-set por presetId, sem afetar os outros problemas", () => {
        const presetId = uniquePresetId();
        const edited = makePreset().map((c) =>
            c.id === SEGMENTOS_ID ? { ...c, weight: 20 } : c.id === PAPEL_ID ? { ...c, weight: 30 } : c,
        );

        criteriaPresetMock.savePreset(presetId, edited);

        expect(criteriaPresetMock.getPreset(presetId)).toEqual(edited);
        expect(criteriaPresetMock.getPreset(uniquePresetId())).toEqual(makePreset());
    });

    it("Deve gravar e devolver cópias: mutar a lista enviada ou a devolvida depois não altera o 'banco'", () => {
        const presetId = uniquePresetId();
        const sent = makePreset();

        const returned = criteriaPresetMock.savePreset(presetId, sent);
        sent[0].weight = 99;
        returned[1].name = "Alterado";

        expect(criteriaPresetMock.getPreset(presetId)).toEqual(makePreset());
    });

    it("Deve ignorar os toggles na soma dos pesos", () => {
        const presetId = uniquePresetId();
        const withHeavyToggles = makePreset().map((c) => (c.isToggle ? { ...c, weight: 50 } : c));

        expect(() => criteriaPresetMock.savePreset(presetId, withHeavyToggles)).not.toThrow();
    });

    // Simula o 422 do backend: soma diferente de 100% é recusada com a soma atual na mensagem
    it.each([
        { total: 99, tweak: (weight: number) => weight - 1 },
        { total: 101, tweak: (weight: number) => weight + 1 },
    ])("Deve recusar a soma de $total% e não gravar nada", ({ total, tweak }) => {
        const presetId = uniquePresetId();
        const invalid = makePreset().map((c) => (c.id === PAPEL_ID ? { ...c, weight: tweak(c.weight) } : c));

        expect(() => criteriaPresetMock.savePreset(presetId, invalid)).toThrow(invalidSumText(total));
        expect(criteriaPresetMock.getPreset(presetId)).toEqual(makePreset());
    });

    it("Deve recusar a lista vazia pela regra da soma (0%)", () => {
        expect(() => criteriaPresetMock.savePreset(uniquePresetId(), [])).toThrow(invalidSumText(0));
    });
});