// src/mocks/problem.mock.ts
import type { ProblemDetails } from "../types/problem";
import type { Problem } from "../types/discipline";
import { gradeMock } from "./grade.mock";
import { roomsMock } from "./rooms.mock";

export const problemDetailsMock: Record<string, ProblemDetails> = {
  prob_01: {
    id: "prob_01",
    title: "Unidade de Decisão e Transição",
    description: "Projeto de FSM com tabelas de excitação",
    disciplineCode: "TEC499",
    semester: "2026.2",
    sessions: [
      {
        id: "session_01",
        problemId: "prob_01",
        date: "2026-04-12",
        displayDate: "12/04",
        status: "self_evaluations_available",
        statusLabel: "Auto Avaliações Disponíveis",
      },
      {
        id: "session_02",
        problemId: "prob_01",
        date: "2026-04-10",
        displayDate: "10/04",
        status: "no_pending_events",
        statusLabel: "Nenhum evento pendente",
      },
      {
        id: "session_03",
        problemId: "prob_01",
        date: "2026-04-05",
        displayDate: "05/04",
        status: "no_pending_events",
        statusLabel: "Nenhum evento pendente",
      },
    ],
  },
  prob_02: {
    id: "prob_02",
    title: "Interação com Nível de Portas Lógicas",
    description: "Interação com nível de portas lógicas e datapath",
    disciplineCode: "TEC499",
    semester: "2026.2",
    sessions: [
      {
        id: "session_04",
        problemId: "prob_02",
        date: "2026-04-08",
        displayDate: "08/04",
        status: "in_progress",
        statusLabel: "Sessão em andamento",
      },
    ],
  },
  prob_03: {
    id: "prob_03",
    title: "Pipeline MIPS de 5 Estágios",
    description: "Implementação de pipeline MIPS de 5 estágios",
    disciplineCode: "TEC498",
    semester: "2026.2",
    sessions: [],
  },
  prob_04: {
    id: "prob_04",
    title: "Unidade Lógica e Aritmética",
    description: "Projeto de unidade lógica e aritmética (ULA)",
    disciplineCode: "TEC499",
    semester: "2026.2",
    sessions: [
      {
        id: "session_05",
        problemId: "prob_04",
        date: "2026-04-15",
        displayDate: "15/04",
        status: "self_evaluations_available",
        statusLabel: "Auto Avaliações Disponíveis",
      },
      {
        id: "session_06",
        problemId: "prob_04",
        date: "2026-04-11",
        displayDate: "11/04",
        status: "completed",
        statusLabel: "Sessão finalizada",
      },
    ],
  },
};

// Cria um problema no "banco" falso: entra na lista da disciplina (tela de disciplinas)
// e nos detalhes (tela do problema). Fica em memória: F5 apaga.
export function createProblemInMock(
  disciplineId: string,
  input: { title: string; description: string }
): Problem {
  const discipline = gradeMock.find((d) => d.id === disciplineId);
  if (!discipline) throw new Error("Disciplina não encontrada.");

  const room = roomsMock.find((r) => r.id === discipline.roomId);
  const problem: Problem = { id: `prob_${Date.now()}`, title: input.title, description: input.description };

  discipline.problems.push(problem);
  problemDetailsMock[problem.id] = {
    ...problem,
    disciplineCode: room?.code ?? "",
    semester: room?.semester ?? "",
    sessions: [],
  };
  return problem;
}
// Exclui o problema da disciplina e dos detalhes. Fica em memória: F5 traz de volta os problemas iniciais.
export function deleteProblemInMock(problemId: string): void {
  gradeMock.forEach((discipline) => {
    discipline.problems = discipline.problems.filter((p) => p.id !== problemId);
  });
  delete problemDetailsMock[problemId];
}
