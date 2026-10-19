import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { StudentFeedbackList } from "@/components/features/feedbacks/StudentFeedbackList";
import type { StudentFeedback } from "@/types/feedback";
import {
  CREATED_AT_LABEL,
  CREATED_AT_UTC_LABEL,
  EMPTY_MESSAGE,
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  makeOlderStudentFeedback,
  makeStudentFeedback,
  OTHER_STUDENT_ID,
  TUTOR_NAME,
} from "../fixtures";

function renderList({
  feedbacks = [makeStudentFeedback(), makeOlderStudentFeedback()] as StudentFeedback[],
  isLoading = false,
  error = null as string | null,
} = {}) {
  render(<StudentFeedbackList feedbacks={feedbacks} isLoading={isLoading} error={error} />);
  return { feedbacks };
}

describe("[US17] StudentFeedbackList", () => {
  it("Deve exibir cada feedback com o nome do tutor, o problema, a nota, o texto e a data", () => {
    const { feedbacks } = renderList();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(feedbacks.length);
    const first = within(items[0]);
    // O nome do tutor emissor precisa estar visível (critério do "Quero")
    expect(first.getByText(TUTOR_NAME)).toBeInTheDocument();
    expect(first.getByText("Problema 1")).toBeInTheDocument();
    expect(first.getByText(/8,5/)).toBeInTheDocument();
    expect(first.getByText("Excelente participação nas sessões")).toBeInTheDocument();
  });

  it("Deve manter a ordem recebida do backend, do mais recente para o mais antigo", () => {
    renderList();

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Problema 1");
    expect(items[1]).toHaveTextContent("Problema 2");
    expect(items[1]).toHaveTextContent(/7,0/);
  });

  it("Deve exibir a data do feedback no fuso de Brasília", () => {
    renderList({ feedbacks: [makeStudentFeedback()] });

    const item = within(screen.getByRole("listitem"));
    expect(item.getByText(CREATED_AT_LABEL)).toBeInTheDocument();
    expect(item.queryByText(CREATED_AT_UTC_LABEL)).not.toBeInTheDocument();
  });

  it("Deve avisar que ainda não há feedbacks quando a lista está vazia", () => {
    renderList({ feedbacks: [] });

    expect(screen.getByText(EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Deve sinalizar o carregamento sem exibir o aviso de lista vazia", () => {
    renderList({ feedbacks: [], isLoading: true });

    // Antes da resposta, "ainda não recebeu" seria uma informação falsa
    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
    expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();
  });

  // --- ISOLAMENTO ---

  it("[QA] Deve exibir em role=\"alert\" a negativa de acesso e nenhum feedback", () => {
    // Mesmo que chegassem itens junto com o erro, nada pode ser exibido sob uma negativa
    renderList({ feedbacks: [makeStudentFeedback()], error: FORBIDDEN_TEXT });

    expect(screen.getByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText(TUTOR_NAME)).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();
  });

  it("Deve exibir só os campos públicos do feedback, mesmo que a resposta traga dados a mais", () => {
    // Mesmos campos que o DataLeakPrevention do backend proíbe; aqui chegam por engano na resposta
    const leaked = {
      ...makeStudentFeedback(),
      tutorEmail: "ana.souza@uefs.br",
      studentId: OTHER_STUDENT_ID,
      password: "segredo123",
    } as StudentFeedback;

    renderList({ feedbacks: [leaked] });

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent(TUTOR_NAME);
    expect(item).not.toHaveTextContent("ana.souza@uefs.br");
    expect(item).not.toHaveTextContent(OTHER_STUDENT_ID);
    expect(item).not.toHaveTextContent("segredo123");
  });

  it("Deve omitir o alerta quando não há erro", () => {
    renderList();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
