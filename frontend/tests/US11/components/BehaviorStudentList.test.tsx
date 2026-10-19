import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BehaviorStudentList } from "@/components/features/behavior-records/BehaviorStudentList";
import { makeOtherStudent, makeStudent, OTHER_STUDENT_ID } from "../fixtures";

function renderList() {
  const onSelectStudent = vi.fn<(studentId: string) => void>();
  const user = userEvent.setup();
  const students = [makeStudent(), makeOtherStudent()];

  render(<BehaviorStudentList students={students} onSelectStudent={onSelectStudent} />);

  return { user, students, onSelectStudent };
}

describe("[US11] BehaviorStudentList", () => {
  it("Deve listar cada aluno da sessão como um botão com o seu nome", () => {
    const { students } = renderList();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(students.length);
    students.forEach((student, index) => {
      expect(within(items[index]).getByRole("button", { name: student.name })).toBeInTheDocument();
    });
  });

  it("Deve selecionar o aluno com um único toque, enviando o id do aluno tocado", async () => {
    const { user, onSelectStudent } = renderList();

    await user.click(screen.getByRole("button", { name: "Bruno Lima" }));

    // 1º dos 2 toques do critério de aceite
    expect(onSelectStudent).toHaveBeenCalledTimes(1);
    expect(onSelectStudent).toHaveBeenCalledWith(OTHER_STUDENT_ID);
  });

  it("Deve dar a cada aluno área de toque de no mínimo 44x44 pixels", () => {
    renderList();

    // O jsdom não calcula layout: a garantia vem das classes do Tailwind (11 = 44px), como na US09
    screen.getAllByRole("button").forEach((button) => {
      expect(button.className).toMatch(/(^|\s)min-h-(11|\[44px\])(\s|$)/);
      expect(button.className).toMatch(/(^|\s)min-w-(11|\[44px\])(\s|$)/);
    });
  });
});
