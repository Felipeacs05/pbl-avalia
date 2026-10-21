import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ClassRosterGrid } from "@/components/features/class-roster/ClassRosterGrid";
import type { ClassRosterStudent } from "@/types/classRoster";
import {
  makeRosterStudent,
  makeStudentWithoutPhoto,
  makeThirdStudent,
  STUDENT_INITIALS,
  STUDENT_NAME,
  STUDENT_PHOTO_URL,
} from "../fixtures";

// Com alt="" a foto não tem papel acessível; o que o critério exige é a ausência do próprio <img>
function photoIn(item: HTMLElement) {
  return item.querySelector("img");
}

const BROKEN_PHOTO_URL = "https://img.uefs.br/link-quebrado.png";

function renderGrid(
  students: ClassRosterStudent[] = [makeRosterStudent(), makeStudentWithoutPhoto(), makeThirdStudent()],
) {
  render(<ClassRosterGrid students={students} />);
  const items = within(screen.getByRole("list")).getAllByRole("listitem");
  return { students, items };
}

describe("[US18] ClassRosterGrid", () => {
  it("Deve exibir na grade o nome de cada aluno, na ordem recebida do backend", () => {
    const { students, items } = renderGrid();

    expect(items).toHaveLength(students.length);
    students.forEach((student, index) => {
      expect(within(items[index]).getByText(student.name)).toBeInTheDocument();
    });
  });

  it("Deve exibir a foto de cada aluno com loading=\"lazy\"", () => {
    const { items } = renderGrid([makeRosterStudent(), makeThirdStudent()]);

    expect(photoIn(items[0])).toHaveAttribute("src", STUDENT_PHOTO_URL);
    expect(photoIn(items[1])).toHaveAttribute("src", makeThirdStudent().profileImageUrl);
    // Nenhuma foto pode ser baixada antes de aparecer na rolagem
    items.forEach((item) => expect(photoIn(item)).toHaveAttribute("loading", "lazy"));
  });

  it("Deve exibir as iniciais enviadas pelo backend quando o aluno não tem foto", () => {
    const { items } = renderGrid([makeStudentWithoutPhoto()]);

    expect(photoIn(items[0])).toBeNull();
    expect(within(items[0]).getByText("J")).toBeInTheDocument();
  });

  it("[QA] Deve trocar só a foto quebrada pelas iniciais do aluno, sem ícone de imagem quebrada e mantendo as demais fotos", () => {
    const brokenPhotoStudent = makeRosterStudent({ profileImageUrl: BROKEN_PHOTO_URL });
    const { items } = renderGrid([brokenPhotoStudent, makeThirdStudent()]);

    // userEvent não simula falha de rede; o evento error é o que o navegador dispara no link quebrado
    fireEvent.error(photoIn(items[0])!);

    expect(photoIn(items[0])).toBeNull();
    // "MS" vem do campo initials; calcular pelas duas primeiras palavras daria "MC"
    expect(within(items[0]).getByText(STUDENT_INITIALS)).toBeInTheDocument();
    expect(within(items[0]).getByText(STUDENT_NAME)).toBeInTheDocument();
    expect(photoIn(items[1])).toHaveAttribute("src", makeThirdStudent().profileImageUrl);
  });
});
