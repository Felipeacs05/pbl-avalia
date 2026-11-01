import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ClassReportTable } from "@/components/features/reports/ClassReportTable";
import type { ClassReport } from "@/types/report";
import {
  EMPTY_VALUE_LABEL,
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  INVALID_WEIGHT_WARNING_MESSAGE,
  makeClassReport,
  makeInvalidWeightWarning,
  makeOpenProblem,
  makeOtherProblem,
  makeOtherStudentRow,
  makeProblem,
  makeStudentRow,
  makeWithdrawnStudentRow,
  OPEN_PROBLEM_ID,
  OPEN_PROBLEM_LABEL,
  OTHER_STUDENT_NAME,
  PROBLEM_ID,
  QA_SIMPLE_AVERAGE_LABEL,
  QA_WEIGHTED_AVERAGE_LABEL,
  STUDENT_NAME,
  WITHDRAWN_STUDENT_NAME,
} from "../fixtures";

function renderTable({
  report = makeClassReport() as ClassReport | null,
  isLoading = false,
  error = null as string | null,
} = {}) {
  render(<ClassReportTable report={report} isLoading={isLoading} error={error} />);
  return { report };
}

function activeTable() {
  return screen.getByRole("table", { name: /alunos ativos/i });
}

function headers(table: HTMLElement): string[] {
  return within(table)
    .getAllByRole("columnheader")
    .map((header) => header.textContent?.trim() ?? "");
}

// Nome do aluno pode vir em <th scope="row"> ou <td>: as duas formas valem
function valuesOf(row: HTMLElement): string[] {
  return [...within(row).queryAllByRole("rowheader"), ...within(row).queryAllByRole("cell")].map(
    (cell) => cell.textContent?.trim() ?? "",
  );
}

// Valor na interseção aluno × coluna, localizando a coluna pelo cabeçalho e não pela posição suposta
function cellText(table: HTMLElement, studentName: string, column: RegExp): string {
  const index = headers(table).findIndex((header) => column.test(header));
  expect(index).toBeGreaterThan(-1);
  const row = within(table).getByRole("row", { name: new RegExp(studentName) });
  return valuesOf(row)[index];
}

describe("[US20] ClassReportTable", () => {
  // --- AGRUPAMENTO POR PROBLEMA ---

  it("Deve exibir uma coluna por problema, na ordem do backend, entre o aluno e a média", () => {
    // Fora da ordem alfabética: a tela não pode reordenar o que o backend já ordenou por criação
    renderTable({ report: makeClassReport({ problems: [makeOtherProblem(), makeProblem()] }) });

    expect(headers(activeTable())).toEqual(["Aluno", "Problema 2", "Problema 1", "Média"]);
  });

  it("Deve exibir cada aluno ativo em uma linha, na ordem do backend", () => {
    // Fora da ordem alfabética, pelo mesmo motivo
    renderTable({ report: makeClassReport({ students: [makeOtherStudentRow(), makeStudentRow()] }) });

    // A primeira linha é o cabeçalho
    const rows = within(activeTable()).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(OTHER_STUDENT_NAME);
    expect(rows[1]).toHaveTextContent(STUDENT_NAME);
  });

  it("Deve colocar cada nota na coluna do seu problema pelo id, e não pela ordem das chaves", () => {
    renderTable();
    const table = activeTable();

    // No Aluno B as chaves vêm na ordem Problema 2, Problema 1
    expect(cellText(table, OTHER_STUDENT_NAME, /^Problema 1/)).toBe("9,0");
    expect(cellText(table, OTHER_STUDENT_NAME, /^Problema 2/)).toBe("5,5");
    expect(cellText(table, STUDENT_NAME, /^Problema 1/)).toBe("8,0");
    expect(cellText(table, STUDENT_NAME, /^Problema 2/)).toBe("7,0");
  });

  it("Deve exibir só os alunos ativos nesta tabela, deixando de fora os de vínculo encerrado", () => {
    renderTable({ report: makeClassReport({ withdrawnStudents: [makeWithdrawnStudentRow()] }) });

    expect(within(activeTable()).queryByText(WITHDRAWN_STUDENT_NAME)).not.toBeInTheDocument();
  });

  // --- MÉDIA GERAL ---

  it("[QA] Deve exibir a média ponderada da API, que bate com o cálculo manual 8 × 0,4 + 7 × 0,6 = 7,4", () => {
    renderTable();
    const table = activeTable();

    expect(cellText(table, STUDENT_NAME, /^Média/)).toBe(QA_WEIGHTED_AVERAGE_LABEL);
    // 7,5 seria a média simples: sinal de que a tela recalculou ignorando os pesos
    expect(within(table).queryByText(QA_SIMPLE_AVERAGE_LABEL)).not.toBeInTheDocument();
  });

  it.each([
    { average: 7.3999999999999995, label: "7,4" },
    { average: 6.833333333333333, label: "6,8" },
    { average: 8.96, label: "9,0" },
    { average: 8, label: "8,0" },
  ])("Deve exibir a média $average arredondada para uma casa decimal", ({ average, label }) => {
    renderTable({ report: makeClassReport({ students: [makeStudentRow({ weightedAverage: average })] }) });

    expect(cellText(activeTable(), STUDENT_NAME, /^Média/)).toBe(label);
  });

  it("Deve exibir — e nunca 0 quando o aluno não tem nota no problema ou não tem média", () => {
    // Média nula: o backend não divide quando a soma dos pesos válidos é zero
    const report = makeClassReport({
      students: [makeStudentRow({ gradesByProblem: { [PROBLEM_ID]: 8 }, weightedAverage: null })],
    });
    renderTable({ report });
    const table = activeTable();

    expect(cellText(table, STUDENT_NAME, /^Problema 2/)).toBe(EMPTY_VALUE_LABEL);
    expect(cellText(table, STUDENT_NAME, /^Média/)).toBe(EMPTY_VALUE_LABEL);
    expect(within(table).queryByText(/^0(,0)?$/)).not.toBeInTheDocument();
  });

  // --- PROBLEMAS NÃO CONCLUÍDOS ---

  it("Deve marcar como em andamento só a coluna do problema ainda aberto", () => {
    const report = makeClassReport({
      problems: [makeProblem(), makeOtherProblem(), makeOpenProblem()],
      openProblemIds: [OPEN_PROBLEM_ID],
    });
    renderTable({ report });
    const table = activeTable();

    const [, first, second, open] = headers(table);
    expect(open).toMatch(/^Problema 3/);
    expect(open).toMatch(OPEN_PROBLEM_LABEL);
    expect(first).not.toMatch(OPEN_PROBLEM_LABEL);
    expect(second).not.toMatch(OPEN_PROBLEM_LABEL);
    expect(cellText(table, STUDENT_NAME, /^Problema 3/)).toBe(EMPTY_VALUE_LABEL);
  });

  // --- DADOS DESCONSIDERADOS ---

  it("Deve exibir o aviso do backend sobre o dado desconsiderado no cálculo", () => {
    renderTable({ report: makeClassReport({ warnings: [makeInvalidWeightWarning()] }) });

    expect(screen.getByText(INVALID_WEIGHT_WARNING_MESSAGE)).toBeInTheDocument();
    // Aviso não é erro: o relatório continua na tela
    expect(activeTable()).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // --- CARREGAMENTO E ERRO ---

  it("Deve sinalizar o carregamento sem exibir a tabela", () => {
    renderTable({ report: null, isLoading: true });

    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("Deve exibir em role=\"alert\" a negativa de acesso e nenhuma nota", () => {
    // Mesmo que chegasse um relatório junto com o erro, nada pode ser exibido sob uma negativa
    renderTable({ error: FORBIDDEN_TEXT });

    expect(screen.getByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(STUDENT_NAME)).not.toBeInTheDocument();
  });

  it("Deve omitir o alerta quando não há erro", () => {
    renderTable();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
