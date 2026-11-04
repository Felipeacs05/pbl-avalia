import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomTabBar } from "@/components/features/navigation/BottomTabBar";
import {
  CREATE_ROOM_BUTTON_TEXT,
  ENTER_ROOM_BUTTON_TEXT,
  STUDENT_TAB_LABEL,
  TEACHER_TAB_LABEL,
} from "../fixtures";

describe("[US02] BottomTabBar", () => {
  it("Deve destacar a aba 'Professor' como ativa e exibir 'Aluno' como link para '/student-rooms' quando activeTab for 'teacher'", () => {
    render(<BottomTabBar activeTab="teacher" />);

    // Na aba de professor, "Professor" é o botão ativo na barra
    const teacherActiveTab = screen.getByRole("button", { name: TEACHER_TAB_LABEL });
    expect(teacherActiveTab).toBeInTheDocument();

    // A aba "Aluno" é um link navegável para o dashboard de aluno
    const studentLink = screen.getByRole("link", { name: STUDENT_TAB_LABEL });
    expect(studentLink).toBeInTheDocument();
    expect(studentLink).toHaveAttribute("href", "/student-rooms");
  });

  it("Deve destacar a aba 'Aluno' como ativa e exibir 'Professor' como link para '/teacher-rooms' quando activeTab for 'student'", () => {
    render(<BottomTabBar activeTab="student" />);

    // Na aba de aluno, "Aluno" é o botão ativo na barra
    const studentActiveTab = screen.getByRole("button", { name: STUDENT_TAB_LABEL });
    expect(studentActiveTab).toBeInTheDocument();

    // A aba "Professor" é um link navegável para o dashboard de professor
    const teacherLink = screen.getByRole("link", { name: TEACHER_TAB_LABEL });
    expect(teacherLink).toBeInTheDocument();
    expect(teacherLink).toHaveAttribute("href", "/teacher-rooms");
  });

  it("Deve exibir o botão de ação rápida 'Criar nova sala' e invocar onCreateRoom quando activeTab for 'teacher'", async () => {
    const onCreateRoom = vi.fn();
    const user = userEvent.setup();

    render(<BottomTabBar activeTab="teacher" onCreateRoom={onCreateRoom} />);

    // No modo tutor/professor, a ação rápida principal é criar sala
    const createButton = screen.getByRole("button", { name: CREATE_ROOM_BUTTON_TEXT });
    expect(createButton).toBeInTheDocument();

    await user.click(createButton);
    expect(onCreateRoom).toHaveBeenCalledTimes(1);
  });

  it("Deve exibir o botão de ação rápida 'Entrar em sala' e invocar onCreateRoom quando activeTab for 'student'", async () => {
    const onEnterRoom = vi.fn();
    const user = userEvent.setup();

    render(<BottomTabBar activeTab="student" onCreateRoom={onEnterRoom} />);

    // No modo aluno, a ação rápida principal é entrar em uma sala através de código
    const enterButton = screen.getByRole("button", { name: ENTER_ROOM_BUTTON_TEXT });
    expect(enterButton).toBeInTheDocument();

    await user.click(enterButton);
    expect(onEnterRoom).toHaveBeenCalledTimes(1);
  });

  it("Deve omitir o botão de ação rápida quando onCreateRoom não for fornecido", () => {
    render(<BottomTabBar activeTab="teacher" />);

    expect(screen.queryByRole("button", { name: CREATE_ROOM_BUTTON_TEXT })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ENTER_ROOM_BUTTON_TEXT })).not.toBeInTheDocument();
  });

  it("Deve sempre renderizar o atalho para a tela de Perfil", () => {
    render(<BottomTabBar activeTab="teacher" />);

    expect(screen.getByRole("button", { name: /perfil/i })).toBeInTheDocument();
  });
});
