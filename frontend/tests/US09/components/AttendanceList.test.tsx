import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendanceList } from "@/components/features/attendance/AttendanceList";
import type { AttendanceRow, AttendanceStatus } from "@/types/attendance";
import {
  ALL_STATUSES,
  makeOtherStudent,
  makeRow,
  makeStudent,
  OTHER_STUDENT_ID,
  RECORDED_AT,
  RECORDED_AT_LABEL,
  STATUS_LABELS,
  TIMEOUT_MESSAGE,
  TIMEOUT_TEXT,
} from "../fixtures";

function renderList(
  students: AttendanceRow[] = [makeRow(makeStudent()), makeRow(makeOtherStudent())],
  error: string | null = null,
) {
  const onChangeStatus = vi.fn<(studentId: string, status: AttendanceStatus) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();

  render(<AttendanceList students={students} error={error} onChangeStatus={onChangeStatus} />);

  return { students, user, onChangeStatus };
}

function rowOf(name: string) {
  const item = screen.getAllByRole("listitem").find((li) => within(li).queryByText(name));
  if (!item) throw new Error(`linha do aluno ${name} não encontrada`);
  return item;
}

describe("[US09] AttendanceList", () => {
  it("Deve listar cada aluno com os quatro botões de status", () => {
    const { students } = renderList();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(students.length);
    students.forEach((student, index) => {
      const row = within(items[index]);
      expect(row.getByText(student.name)).toBeInTheDocument();
      // Nome exato: "Falta" não pode casar com "Falta Justificada"
      ALL_STATUSES.forEach((status) => {
        expect(row.getByRole("button", { name: STATUS_LABELS[status] })).toBeInTheDocument();
      });
    });
  });

  it("Deve marcar com aria-pressed apenas o status atual de cada aluno", () => {
    renderList([makeRow(makeStudent({ status: "LATE", recordedAt: RECORDED_AT })), makeRow(makeOtherStudent())]);

    const markedRow = within(rowOf("Alice Souza"));
    ALL_STATUSES.forEach((status) => {
      expect(markedRow.getByRole("button", { name: STATUS_LABELS[status] }))
        .toHaveAttribute("aria-pressed", String(status === "LATE"));
    });
    // Aluno ainda sem chamada: nenhum status marcado
    within(rowOf("Bruno Lima")).getAllByRole("button").forEach((button) => {
      expect(button).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("Deve exibir o horário salvo pelo servidor no fuso de Brasília apenas para quem já tem registro", () => {
    renderList([makeRow(makeStudent({ status: "PRESENT", recordedAt: RECORDED_AT })), makeRow(makeOtherStudent())]);

    expect(within(rowOf("Alice Souza")).getByText(RECORDED_AT_LABEL)).toBeInTheDocument();
    expect(within(rowOf("Bruno Lima")).queryByText(/às \d{2}:\d{2}/)).not.toBeInTheDocument();
  });

  it("Deve enviar ao callback o aluno e o status tocados", async () => {
    const { user, onChangeStatus } = renderList();

    await user.click(within(rowOf("Bruno Lima")).getByRole("button", { name: "Falta Justificada" }));

    expect(onChangeStatus).toHaveBeenCalledTimes(1);
    expect(onChangeStatus).toHaveBeenCalledWith(OTHER_STUDENT_ID, "JUSTIFIED_ABSENCE");
  });

  it("Deve sinalizar o salvamento só na linha do aluno e manter toda a lista utilizável", async () => {
    const { user, onChangeStatus } = renderList([
      makeRow(makeStudent({ status: "ABSENT" }), true),
      makeRow(makeOtherStudent()),
    ]);
    // Rede lenta: o callback nunca termina, e o componente não pode esperar por ele
    onChangeStatus.mockReturnValue(new Promise<void>(() => {}));

    // O salvamento em segundo plano não pode bloquear a lista inteira
    expect(screen.getByRole("list")).not.toHaveAttribute("aria-busy", "true");
    expect(rowOf("Alice Souza")).toHaveAttribute("aria-busy", "true");
    expect(rowOf("Bruno Lima")).not.toHaveAttribute("aria-busy", "true");
    screen.getAllByRole("button").forEach((button) => expect(button).toBeEnabled());

    await user.click(within(rowOf("Bruno Lima")).getByRole("button", { name: "Presente" }));
    await user.click(within(rowOf("Bruno Lima")).getByRole("button", { name: "Atraso" }));

    // O segundo toque passa mesmo com o primeiro ainda pendente
    expect(onChangeStatus).toHaveBeenNthCalledWith(1, OTHER_STUDENT_ID, "PRESENT");
    expect(onChangeStatus).toHaveBeenNthCalledWith(2, OTHER_STUDENT_ID, "LATE");
    screen.getAllByRole("button").forEach((button) => expect(button).toBeEnabled());
  });

  it("Deve dar a cada botão de status área de toque de no mínimo 44x44 pixels", () => {
    renderList();

    // O jsdom não calcula layout: a garantia vem das classes do Tailwind (11 = 44px)
    screen.getAllByRole("button").forEach((button) => {
      expect(button.className).toMatch(/(^|\s)min-h-(11|\[44px\])(\s|$)/);
      expect(button.className).toMatch(/(^|\s)min-w-(11|\[44px\])(\s|$)/);
    });
  });

  it("[QA] Deve exibir o aviso de timeout em role=\"alert\" sem esconder nem bloquear a lista", () => {
    renderList(undefined, TIMEOUT_TEXT);

    expect(screen.getByRole("alert")).toHaveTextContent(TIMEOUT_MESSAGE);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    screen.getAllByRole("button").forEach((button) => expect(button).toBeEnabled());
  });

  it("Deve omitir o alerta quando não há erro", () => {
    renderList();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
