import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackComposer } from "@/components/features/feedbacks/FeedbackComposer";
import type { Feedback, FeedbackInput } from "@/types/feedback";
import {
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  makeFeedback,
  makeOtherFeedback,
  makeOtherStudent,
  makeStudent,
  OTHER_STUDENT_ID,
  TEXT,
  TIMEOUT_MESSAGE,
  TIMEOUT_TEXT,
} from "../fixtures";

function renderComposer({
  isSending = false,
  error = null as string | null,
  sentFeedbacks = [] as Feedback[],
} = {}) {
  const onSendToStudent = vi
    .fn<(studentId: string, input: FeedbackInput) => Promise<void>>()
    .mockResolvedValue(undefined);
  const onSendToClass = vi.fn<(input: FeedbackInput) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();
  const students = [makeStudent(), makeOtherStudent()];

  render(
    <FeedbackComposer
      students={students}
      isSending={isSending}
      error={error}
      sentFeedbacks={sentFeedbacks}
      onSendToStudent={onSendToStudent}
      onSendToClass={onSendToClass}
    />,
  );

  return {
    user,
    students,
    onSendToStudent,
    onSendToClass,
    gradeInput: screen.getByLabelText(/nota/i),
    textInput: screen.getByLabelText(/feedback/i),
    studentSelect: screen.getByLabelText(/aluno/i),
    studentButton: screen.getByRole("button", { name: /enviar para o aluno/i }),
    classButton: screen.getByRole("button", { name: /enviar para a turma/i }),
  };
}

describe("[US16] FeedbackComposer", () => {
  it("Deve oferecer cada aluno do problema e as duas formas de envio", () => {
    const { students, studentSelect, studentButton, classButton } = renderComposer();

    const options = within(studentSelect).getAllByRole("option").filter((option) => option.getAttribute("value"));
    expect(options.map((option) => option.textContent)).toEqual(students.map((student) => student.name));
    expect(studentButton).toBeEnabled();
    expect(classButton).toBeEnabled();
  });

  // --- ENVIO INDIVIDUAL ---

  it("Deve enviar ao aluno escolhido a nota como número e o texto digitado", async () => {
    const { user, onSendToStudent, onSendToClass, gradeInput, textInput, studentSelect, studentButton } =
      renderComposer();

    // O segundo aluno da lista: o envio precisa usar o id, e não a posição
    await user.selectOptions(studentSelect, "Bruno Lima");
    await user.type(gradeInput, "8.5");
    await user.type(textInput, TEXT);
    await user.click(studentButton);

    expect(onSendToStudent).toHaveBeenCalledTimes(1);
    // 8.5 e não "8.5": o backend espera um Double
    expect(onSendToStudent).toHaveBeenCalledWith(OTHER_STUDENT_ID, { grade: 8.5, text: TEXT });
    expect(onSendToClass).not.toHaveBeenCalled();
  });

  // --- ENVIO PARA A TURMA ---

  it("Deve enviar a mesma nota e o mesmo texto para a turma em um único disparo", async () => {
    const { user, onSendToStudent, onSendToClass, gradeInput, textInput, classButton } = renderComposer();

    await user.type(gradeInput, "8.5");
    await user.type(textInput, TEXT);
    await user.click(classButton);

    // Critério de Desempenho: um disparo para a turma, não um por aluno
    expect(onSendToClass).toHaveBeenCalledTimes(1);
    expect(onSendToClass).toHaveBeenCalledWith({ grade: 8.5, text: TEXT });
    expect(onSendToStudent).not.toHaveBeenCalled();
  });

  it("Deve enviar mesmo com a nota vazia e o texto em branco, deixando a recusa (400) para o backend", async () => {
    const { user, onSendToClass, textInput, classButton } = renderComposer();

    await user.type(textInput, "   ");
    await user.click(classButton);

    // Nota vazia vai como null, para o @NotNull do backend responder, e não como 0
    expect(onSendToClass).toHaveBeenCalledWith({ grade: null, text: "   " });
  });

  it("Deve desabilitar os envios enquanto um lote está em andamento", async () => {
    const { user, onSendToStudent, onSendToClass, textInput, studentButton, classButton } = renderComposer({
      isSending: true,
    });

    // Um segundo lote durante o primeiro dobraria a carga que o critério de Desempenho quer evitar
    expect(classButton).toBeDisabled();
    expect(studentButton).toBeDisabled();

    await user.type(textInput, TEXT);
    await user.click(classButton);
    expect(onSendToClass).not.toHaveBeenCalled();
    expect(onSendToStudent).not.toHaveBeenCalled();
  });

  // --- ERRO DO BACKEND ---

  it("Deve exibir em role=\"alert\" a mensagem recebida quando o envio é recusado", () => {
    const { classButton } = renderComposer({ error: FORBIDDEN_TEXT });

    expect(screen.getByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    // O tutor pode tentar de novo
    expect(classButton).toBeEnabled();
  });

  it("[QA] Deve exibir em role=\"alert\" o aviso de tempo esgotado e manter o envio disponível", () => {
    const { classButton } = renderComposer({ error: TIMEOUT_TEXT });

    expect(screen.getByRole("alert")).toHaveTextContent(TIMEOUT_MESSAGE);
    expect(classButton).toBeEnabled();
  });

  // --- CONFIRMAÇÃO DO SERVIDOR ---

  it("Deve confirmar em role=\"status\" quantos feedbacks o servidor gravou", () => {
    renderComposer({ sentFeedbacks: [makeFeedback(), makeOtherFeedback()] });

    expect(screen.getByRole("status")).toHaveTextContent(/feedback enviado para 2 alunos/i);
  });

  it("Deve usar a contagem da resposta quando o servidor grava menos feedbacks que os alunos da tela", () => {
    renderComposer({ sentFeedbacks: [makeOtherFeedback()] });

    // Dois alunos na tela, um feedback gravado (envio individual): a confirmação segue o servidor
    expect(screen.getByRole("status")).toHaveTextContent(/feedback enviado para 1 aluno\b/i);
  });

  it("Deve omitir o alerta e a confirmação quando nada foi enviado", () => {
    renderComposer();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
