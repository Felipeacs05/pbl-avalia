import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { WithdrawnStudentsTable } from "@/components/features/reports/WithdrawnStudentsTable";
import type { WithdrawnStudentRow } from "@/types/report";
import {
  EMPTY_VALUE_LABEL,
  makeOpenProblem,
  makeOtherProblem,
  makeProblem,
  makeWithdrawnStudentRow,
  WITHDRAWN_STUDENT_NAME,
} from "../fixtures";

function renderTable(students: WithdrawnStudentRow[] = [makeWithdrawnStudentRow()]) {
  // O Problema 3 ainda está aberto: o aluno que trancou não tem nota nele
  render(
    <WithdrawnStudentsTable problems={[makeProblem(), makeOtherProblem(), makeOpenProblem()]} students={students} />,
  );
}

function withdrawnTable() {
  return screen.getByRole("table", { name: /vínculo encerrado/i });
}

describe("[US20] WithdrawnStudentsTable", () => {
  it("Deve listar à parte o aluno de vínculo encerrado com a nota de cada problema e a média parcial", () => {
    renderTable();
    const table = withdrawnTable();

    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.trim());
    expect(headers).toEqual(["Aluno", "Problema 1", "Problema 2", "Problema 3", "Média parcial"]);

    const row = within(table).getByRole("row", { name: new RegExp(WITHDRAWN_STUDENT_NAME) });
    const values = [...within(row).queryAllByRole("rowheader"), ...within(row).queryAllByRole("cell")].map(
      (cell) => cell.textContent?.trim(),
    );
    // A média parcial é a devolvida pela API (3,6), e não a média simples das notas (3,5)
    expect(values).toEqual([WITHDRAWN_STUDENT_NAME, "3,0", "4,0", EMPTY_VALUE_LABEL, "3,6"]);
  });

  it("Deve omitir a seção quando nenhum aluno trancou ou cancelou o vínculo", () => {
    renderTable([]);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/vínculo encerrado/i)).not.toBeInTheDocument();
  });
});
