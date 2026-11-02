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
  presenceLabel,
  RECORDED_AT,
  RECORDED_AT_LABEL,
  STATUS_LABELS,
  TIMEOUT_MESSAGE,
  TIMEOUT_TEXT,
} from "../fixtures";

type User = ReturnType<typeof userEvent.setup>;

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

function presenceButton(name: string) {
  return within(rowOf(name)).getByRole("button", { name: new RegExp(`^Presença de ${name}:`) });
}

function alwaysEnabledButtons() {
  return screen.getAllByRole("button", { name: /^(Presença|Tags) de / });
}

function confirmButton() {
  return within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar" });
}

function statusOption(status: AttendanceStatus) {
  return within(screen.getByRole("dialog")).getByRole("button", { name: STATUS_LABELS[status] });
}

async function chooseStatus(user: User, name: string, status: AttendanceStatus) {
  await user.click(presenceButton(name));
  await user.click(statusOption(status));
  await user.click(confirmButton());
}

describe("[US09] AttendanceList", () => {
  it("Deve listar cada aluno com o botão de presença que abre os quatro status", async () => {
    const { students, user, onChangeStatus } = renderList();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(students.length);
    for (const [index, student] of students.entries()) {
      const row = within(items[index]);
      expect(row.getByText(student.name)).toBeInTheDocument();
      await user.click(row.getByRole("button", { name: presenceLabel(student.name, null) }));

      const dialog = within(screen.getByRole("dialog"));
      expect(dialog.getByText(student.name)).toBeInTheDocument();
      // Nome exato: "Falta" não pode casar com "Falta Justificada"
      ALL_STATUSES.forEach((status) => {
        expect(dialog.getByRole("button", { name: STATUS_LABELS[status] })).toBeInTheDocument();
      });
      await user.click(dialog.getByRole("button", { name: "Fechar modal de presença" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
    expect(onChangeStatus).not.toHaveBeenCalled();
  });

  it("Deve indicar apenas o status atual de cada aluno no botão de presença e no modal", async () => {
    const { user, onChangeStatus } = renderList([makeRow(makeStudent({ status: "LATE", recordedAt: RECORDED_AT })), makeRow(makeOtherStudent())]);

    expect(presenceButton("Alice Souza")).toHaveAccessibleName(presenceLabel("Alice Souza", "LATE"));
    await user.click(presenceButton("Alice Souza"));
    ALL_STATUSES.forEach((status) => {
      expect(statusOption(status)).toHaveAttribute("aria-pressed", String(status === "LATE"));
    });
    expect(confirmButton()).toBeDisabled();
    await user.click(statusOption("PRESENT"));
    expect(confirmButton()).toBeEnabled();
    await user.click(statusOption("LATE"));
    expect(confirmButton()).toBeDisabled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Aluno ainda sem chamada: nenhum status marcado
    expect(presenceButton("Bruno Lima")).toHaveAccessibleName(presenceLabel("Bruno Lima", null));
    await user.click(presenceButton("Bruno Lima"));
    ALL_STATUSES.forEach((status) => {
      expect(statusOption(status)).toHaveAttribute("aria-pressed", "false");
    });
    expect(confirmButton()).toBeDisabled();
    expect(onChangeStatus).not.toHaveBeenCalled();
  });

  it("Deve exibir o horário salvo pelo servidor no fuso de Brasília apenas para quem já tem registro", () => {
    renderList([makeRow(makeStudent({ status: "PRESENT", recordedAt: RECORDED_AT })), makeRow(makeOtherStudent())]);

    expect(within(rowOf("Alice Souza")).getByText(RECORDED_AT_LABEL)).toBeInTheDocument();
    expect(within(rowOf("Bruno Lima")).queryByText(/às \d{2}:\d{2}/)).not.toBeInTheDocument();
  });

  it("Deve enviar ao callback o aluno e o status confirmados no modal", async () => {
    const { user, onChangeStatus } = renderList();

    await user.click(presenceButton("Bruno Lima"));
    await user.click(statusOption("JUSTIFIED_ABSENCE"));
    expect(onChangeStatus).not.toHaveBeenCalled();

    await user.click(confirmButton());

    expect(onChangeStatus).toHaveBeenCalledTimes(1);
    expect(onChangeStatus).toHaveBeenCalledWith(OTHER_STUDENT_ID, "JUSTIFIED_ABSENCE");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    alwaysEnabledButtons().forEach((button) => expect(button).toBeEnabled());

    await chooseStatus(user, "Bruno Lima", "PRESENT");
    await chooseStatus(user, "Bruno Lima", "LATE");

    // O segundo toque passa mesmo com o primeiro ainda pendente
    expect(onChangeStatus).toHaveBeenNthCalledWith(1, OTHER_STUDENT_ID, "PRESENT");
    expect(onChangeStatus).toHaveBeenNthCalledWith(2, OTHER_STUDENT_ID, "LATE");
    alwaysEnabledButtons().forEach((button) => expect(button).toBeEnabled());
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
    alwaysEnabledButtons().forEach((button) => expect(button).toBeEnabled());
  });

  it("Deve omitir o alerta quando não há erro", () => {
    renderList();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
