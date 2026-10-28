import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluationMock } from "@/mocks/evaluationMock";
import { selfEvaluationMock } from "@/mocks/selfEvaluation.mock";
import { CLOSED_PROBLEM_ID, makeSelfEvaluationSubmission, PROBLEM_ID } from "../fixtures";

const SUBMIT_DELAY_MS = 600;

beforeEach(() => {
    // O estado do mock é global do módulo: cada teste parte dos problemas iniciais
    evaluationMock.reset();
    vi.useFakeTimers();
    // O mock registra o envio no console; o teste silencia e confere o que seria enviado
    vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
    vi.useRealTimers();
});

describe("[US13] selfEvaluationMock", () => {
    it("Deve informar que a autoavaliação está aberta só quando o tipo liberado é self_evaluation", () => {
        expect(selfEvaluationMock.isOpen(PROBLEM_ID)).toBe(true);
        expect(selfEvaluationMock.isOpen(CLOSED_PROBLEM_ID)).toBe(false);

        // prob_3 tem avaliação entre pares liberada: outro tipo não abre a autoavaliação
        expect(selfEvaluationMock.isOpen("prob_3")).toBe(false);
    });

    it("Deve resolver o envio depois do atraso simulado quando o problema está liberado", async () => {
        const data = makeSelfEvaluationSubmission();
        let settled = false;
        const request = selfEvaluationMock.submit(PROBLEM_ID, data).then(() => {
            settled = true;
        });

        // Antes do atraso, nada terminou: a tela precisa de tempo para exibir o "Enviando..."
        await vi.advanceTimersByTimeAsync(SUBMIT_DELAY_MS - 1);
        expect(settled).toBe(false);

        await vi.advanceTimersByTimeAsync(1);
        await request;

        expect(settled).toBe(true);
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining(PROBLEM_ID), data);
    });

    it("[QA] Deve rejeitar com response.status 403 quando o problema não está liberado", async () => {
        const request = selfEvaluationMock.submit(CLOSED_PROBLEM_ID, makeSelfEvaluationSubmission());
        // Registrada antes de avançar o relógio, para a rejeição não ficar sem tratamento
        const outcome = expect(request).rejects.toMatchObject({ response: { status: 403 } });

        await vi.advanceTimersByTimeAsync(SUBMIT_DELAY_MS);

        await outcome;
        // Recusado: nada é "enviado"
        expect(console.log).not.toHaveBeenCalled();
    });

    it("[QA] Deve rejeitar com 403 quando o tutor desativa a liberação depois de o aluno abrir o formulário", async () => {
        // Formulário aberto com o problema liberado...
        expect(selfEvaluationMock.isOpen(PROBLEM_ID)).toBe(true);
        // ...e o tutor fecha a liberação antes do envio
        evaluationMock.saveStatus(PROBLEM_ID, null);

        const request = selfEvaluationMock.submit(PROBLEM_ID, makeSelfEvaluationSubmission());
        const outcome = expect(request).rejects.toMatchObject({ response: { status: 403 } });
        await vi.advanceTimersByTimeAsync(SUBMIT_DELAY_MS);

        await outcome;
    });

    it("[QA] Deve rejeitar com 403 quando a liberação ativa é a de avaliação entre pares", async () => {
        // A chave da autoavaliação é independente da de pares (US14)
        evaluationMock.saveStatus(PROBLEM_ID, "peer_evaluation");

        const request = selfEvaluationMock.submit(PROBLEM_ID, makeSelfEvaluationSubmission());
        const outcome = expect(request).rejects.toMatchObject({ response: { status: 403 } });
        await vi.advanceTimersByTimeAsync(SUBMIT_DELAY_MS);

        await outcome;
    });

    it("Deve aceitar o envio de um problema liberado depois do reset do evaluationMock", async () => {
        evaluationMock.saveStatus(PROBLEM_ID, null);
        evaluationMock.reset();

        const request = selfEvaluationMock.submit(PROBLEM_ID, makeSelfEvaluationSubmission());
        await vi.advanceTimersByTimeAsync(SUBMIT_DELAY_MS);

        await expect(request).resolves.toBeUndefined();
    });
});