import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDiscipline, useDisciplines } from "@/hooks/useDiscipline";
import { gradeMock } from "@/mocks/grade.mock";
import {
    DISCIPLINE_ID,
    makeDiscipline,
    makeGradeMock,
    makeNewProblem,
    makeOtherProblem,
    makeProblem,
    MISSING_DISCIPLINE_ID,
    NEW_PROBLEM_ID,
    OTHER_DISCIPLINE_ID,
    OTHER_PROBLEM_ID,
    OTHER_ROOM_ID,
    PROBLEM_ID,
    ROOM_ID,
} from "../fixtures";

// Substitui o "banco" falso por dados fixos; o hook lê o mesmo módulo, então o teste pode alterá-lo
vi.mock("@/mocks/grade.mock", async () => {
    const { makeGradeMock } = await import("../fixtures");
    return { gradeMock: makeGradeMock() };
});

// O hook espera 400 ms de latência simulada: relógio falso evita teste lento
const LATENCY_MS = 400;

async function flushLatency() {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(LATENCY_MS);
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    gradeMock.splice(0, gradeMock.length, ...makeGradeMock());
});

afterEach(() => {
    vi.useRealTimers();
});

describe("[US05] useDiscipline", () => {
    it("Deve carregar a disciplina da sala e devolvê-la com os problemas na ordem do banco", async () => {
        const { result } = renderHook(() => useDiscipline(ROOM_ID, DISCIPLINE_ID));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.discipline).toBeNull();
        await flushLatency();

        expect(result.current.isLoading).toBe(false);
        expect(result.current.discipline).toEqual(makeDiscipline());
        expect(result.current.discipline?.problems.map((p) => p.id)).toEqual([PROBLEM_ID, OTHER_PROBLEM_ID]);
    });

    it("Deve devolver null quando a disciplina existe mas é de outra sala", async () => {
        const { result } = renderHook(() => useDiscipline(ROOM_ID, OTHER_DISCIPLINE_ID));

        await flushLatency();

        // Filtrar só pelo id da disciplina vazaria problemas entre salas
        expect(result.current.isLoading).toBe(false);
        expect(result.current.discipline).toBeNull();
    });

    it("Deve devolver null quando a disciplina não existe", async () => {
        const { result } = renderHook(() => useDiscipline(ROOM_ID, MISSING_DISCIPLINE_ID));

        await flushLatency();

        expect(result.current.isLoading).toBe(false);
        expect(result.current.discipline).toBeNull();
    });
});

describe("[US05] useDisciplines", () => {
    it("Deve listar só as disciplinas da sala informada", async () => {
        const { result } = renderHook(() => useDisciplines(ROOM_ID));

        expect(result.current.isLoading).toBe(true);
        await flushLatency();

        expect(result.current.isLoading).toBe(false);
        expect(result.current.disciplines.map((d) => d.id)).toEqual([DISCIPLINE_ID]);
    });

    it("Deve devolver lista vazia para uma sala sem disciplinas", async () => {
        const { result } = renderHook(() => useDisciplines("sala-sem-disciplinas"));

        await flushLatency();

        expect(result.current.isLoading).toBe(false);
        expect(result.current.disciplines).toEqual([]);
    });

    it("Deve trocar a lista quando a sala muda", async () => {
        const { result, rerender } = renderHook(({ roomId }) => useDisciplines(roomId), {
            initialProps: { roomId: ROOM_ID },
        });
        await flushLatency();
        expect(result.current.disciplines.map((d) => d.id)).toEqual([DISCIPLINE_ID]);

        rerender({ roomId: OTHER_ROOM_ID });
        await flushLatency();

        expect(result.current.disciplines.map((d) => d.id)).toEqual([OTHER_DISCIPLINE_ID]);
    });

    it("Deve manter a ordem de criação e mostrar o problema novo no fim ao refazer a busca", async () => {
        const { result } = renderHook(() => useDisciplines(ROOM_ID));
        await flushLatency();

        // O banco ganhou um problema depois dos dois primeiros
        gradeMock[0].problems.push(makeNewProblem());
        await act(async () => {
            const pending = result.current.refetch();
            await vi.advanceTimersByTimeAsync(LATENCY_MS);
            await pending;
        });

        expect(result.current.disciplines[0].problems.map((p) => p.id)).toEqual([
            PROBLEM_ID,
            OTHER_PROBLEM_ID,
            NEW_PROBLEM_ID,
        ]);
    });

    it("Deve preservar a ordem recebida, sem reordenar por título", async () => {
        // Título "Problema 2" vem antes de "Problema 1" no banco: a ordem cronológica é a do banco
        gradeMock[0].problems = [makeOtherProblem(), makeProblem()];
        const { result } = renderHook(() => useDisciplines(ROOM_ID));

        await flushLatency();

        expect(result.current.disciplines[0].problems.map((p) => p.title)).toEqual(["Problema 2", "Problema 1"]);
    });

    it("Deve refletir a exclusão de um problema ao refazer a busca", async () => {
        const { result } = renderHook(() => useDisciplines(ROOM_ID));
        await flushLatency();

        gradeMock[0].problems = gradeMock[0].problems.filter((p) => p.id !== PROBLEM_ID);
        await act(async () => {
            const pending = result.current.refetch();
            await vi.advanceTimersByTimeAsync(LATENCY_MS);
            await pending;
        });

        expect(result.current.disciplines[0].problems.map((p) => p.id)).toEqual([OTHER_PROBLEM_ID]);
    });

    it("Deve manter a lista na tela (isLoading false) enquanto refaz a busca", async () => {
        const { result } = renderHook(() => useDisciplines(ROOM_ID));
        await flushLatency();

        let pending!: Promise<void>;
        act(() => {
            pending = result.current.refetch();
        });

        // Piscar o carregamento a cada exclusão esconderia a lista do tutor
        expect(result.current.isLoading).toBe(false);
        expect(result.current.disciplines).toHaveLength(1);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(LATENCY_MS);
            await pending;
        });
    });
});