import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionRoleList } from "@/components/features/session-roles/SessionRoleList";
import type { SessionRole, SessionRoleRow } from "@/types/sessionRole";
import {
  ALL_ROLES,
  EXTRA_GRADE_VALIDATION_MESSAGE,
  makeOtherStudent,
  makeRow,
  makeStudent,
  OTHER_STUDENT_ID,
  ROLE_LABELS,
  ROLE_TAKEN_MESSAGE,
  ROLE_TAKEN_TEXT,
} from "../fixtures";

function renderList(
  students: SessionRoleRow[] = [makeRow(makeStudent()), makeRow(makeOtherStudent())],
  error: string | null = null,
) {
  const onAssignRole = vi
    .fn<(studentId: string, role: SessionRole, extraGrade: number) => Promise<void>>()
    .mockResolvedValue(undefined);
  const user = userEvent.setup();

  render(<SessionRoleList students={students} error={error} onAssignRole={onAssignRole} />);

  return { students, user, onAssignRole };
}

function rowOf(name: string) {
  const item = screen.getAllByRole("listitem").find((li) => within(li).queryByText(name));
  if (!item) throw new Error(`linha do aluno ${name} não encontrada`);
  return item;
}

// A badge tem o mesmo texto da opção do select: as opções ficam fora da busca
function queryBadge(row: HTMLElement, role: SessionRole) {
  return within(row).queryByText(ROLE_LABELS[role], { ignore: "script, style, option" });
}

async function fillAssignment(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
  role: SessionRole,
  extraGrade: string,
) {
  await user.selectOptions(within(row).getByLabelText(/papel/i), ROLE_LABELS[role]);
  const gradeInput = within(row).getByLabelText(/nota extra/i);
  await user.clear(gradeInput);
  if (extraGrade !== "") await user.type(gradeInput, extraGrade);
  await user.click(within(row).getByRole("button", { name: /atribuir/i }));
}

describe("[US10] SessionRoleList", () => {
  it("Deve listar cada aluno com a escolha dos três papéis, a nota extra e o botão de atribuir", () => {
    const { students } = renderList();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(students.length);
    students.forEach((student, index) => {
      const row = within(items[index]);
      expect(row.getByText(student.name)).toBeInTheDocument();
      ALL_ROLES.forEach((role) => {
        expect(row.getByRole("option", { name: ROLE_LABELS[role] })).toBeInTheDocument();
      });
      expect(row.getByLabelText(/nota extra/i)).toBeInTheDocument();
      expect(row.getByRole("button", { name: /atribuir/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(ALL_ROLES)("Deve destacar com uma badge o papel %s apenas na linha do aluno que o recebeu", (role: SessionRole) => {
    renderList([makeRow(makeStudent({ role, extraGrade: 1 })), makeRow(makeOtherStudent())]);

    const badge = queryBadge(rowOf("Alice Souza"), role);
    expect(badge).toBeInTheDocument();
    // Destaque visual: a badge precisa de cor de fundo; o projeto usa classes bg- do Tailwind, inclusive arbitrárias (bg-[#4354A0])
    expect(badge?.className).toMatch(/(^|\s)bg-\S+/);
    // Aluno sem papel: nenhuma badge
    ALL_ROLES.forEach((other) => {
      expect(queryBadge(rowOf("Bruno Lima"), other)).not.toBeInTheDocument();
    });
  });

  it("Deve exibir a badge já durante o salvamento, sinalizando só a linha do aluno", () => {
    renderList([makeRow(makeStudent({ role: "COORDINATOR", extraGrade: 1 }), true), makeRow(makeOtherStudent())]);

    // Destaque imediato: a badge não espera a resposta do servidor
    expect(queryBadge(rowOf("Alice Souza"), "COORDINATOR")).toBeInTheDocument();
    expect(rowOf("Alice Souza")).toHaveAttribute("aria-busy", "true");
    expect(rowOf("Bruno Lima")).not.toHaveAttribute("aria-busy", "true");
  });

  it("Deve enviar ao callback o aluno, o papel escolhido e a nota extra como número", async () => {
    const { user, onAssignRole } = renderList();

    await fillAssignment(user, rowOf("Bruno Lima"), "TABLE_SECRETARY", "0.5");

    expect(onAssignRole).toHaveBeenCalledTimes(1);
    expect(onAssignRole).toHaveBeenCalledWith(OTHER_STUDENT_ID, "TABLE_SECRETARY", 0.5);
  });

  it("[QA] Deve enviar mesmo quando o papel de Secretário já está com outro aluno, deixando a recusa (422) para o backend", async () => {
    const { user, onAssignRole } = renderList([
      makeRow(makeStudent({ role: "BOARD_SECRETARY", extraGrade: 0.5 })),
      makeRow(makeOtherStudent()),
    ]);

    await fillAssignment(user, rowOf("Bruno Lima"), "BOARD_SECRETARY", "0.5");

    expect(onAssignRole).toHaveBeenCalledWith(OTHER_STUDENT_ID, "BOARD_SECRETARY", 0.5);
  });

  // %f no lugar de $grade: com $var o zero sai como "+0" no título
  it.each([0, 10])("Deve aceitar a nota extra %f, limite da faixa de 0 a 10", async (grade: number) => {
    const { user, onAssignRole } = renderList();

    await fillAssignment(user, rowOf("Bruno Lima"), "COORDINATOR", String(grade));

    expect(onAssignRole).toHaveBeenCalledWith(OTHER_STUDENT_ID, "COORDINATOR", grade);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([-0.5, 10.5])("Deve bloquear a atribuição quando a nota extra %f está fora de 0 a 10", async (grade: number) => {
    const { user, onAssignRole } = renderList();

    await fillAssignment(user, rowOf("Bruno Lima"), "COORDINATOR", String(grade));

    expect(await screen.findByRole("alert")).toHaveTextContent(EXTRA_GRADE_VALIDATION_MESSAGE);
    expect(onAssignRole).not.toHaveBeenCalled();
  });

  it("Deve bloquear a atribuição quando a nota extra está em branco", async () => {
    const { user, onAssignRole } = renderList();

    await fillAssignment(user, rowOf("Bruno Lima"), "COORDINATOR", "");

    expect(await screen.findByRole("alert")).toHaveTextContent(EXTRA_GRADE_VALIDATION_MESSAGE);
    expect(onAssignRole).not.toHaveBeenCalled();
  });

  it("[QA] Deve exibir a recusa do backend em role=\"alert\" sem esconder a lista", () => {
    renderList(undefined, ROLE_TAKEN_TEXT);

    expect(screen.getByRole("alert")).toHaveTextContent(ROLE_TAKEN_MESSAGE);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
