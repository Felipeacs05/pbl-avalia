// src/mocks/problem.mock.ts
import type { ProblemDetails, Session } from "../types/problem";
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
// Cria uma sessão nova dentro do problema (matéria), "em andamento": ela fica na lista de sessões
// até as notas serem fechadas. Entra no topo, como a mais recente. Fica em memória: F5 apaga.
export function createSessionInMock(problemId: string): Session {
  const now = new Date();
  const session: Session = {
    id: `session_${now.getTime()}`,
    problemId,
    date: now.toISOString().slice(0, 10),
    displayDate: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(now),
    status: "in_progress",
    statusLabel: "Sessão em andamento",
  };
  const details = problemDetailsMock[problemId];
  if (!details) throw new Error("Problema não encontrado.");
  details.sessions = [session, ...details.sessions];
  return session;
}

// Atualiza título e descrição do problema (lista da disciplina e detalhes). Fica em memória.
export function updateProblemInMock(problemId: string, input: { title: string; description: string }): void {
  gradeMock.forEach((discipline) => {
    discipline.problems = discipline.problems.map((p) => (p.id === problemId ? { ...p, ...input } : p));
  });
  if (problemDetailsMock[problemId]) {
    problemDetailsMock[problemId] = { ...problemDetailsMock[problemId], ...input };
  }
}
// Exclui o problema da disciplina e dos detalhes. Fica em memória: F5 traz de volta os problemas iniciais.
export function deleteProblemInMock(problemId: string): void {
  gradeMock.forEach((discipline) => {
    discipline.problems = discipline.problems.filter((p) => p.id !== problemId);
  });
  delete problemDetailsMock[problemId];
}
