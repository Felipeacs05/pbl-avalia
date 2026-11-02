import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GradeAdjustmentForm } from "@/components/features/grade-adjustment/GradeAdjustmentForm";
import type { GradeAdjustmentInput } from "@/types/gradeAdjustment";
import {
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  JUSTIFICATION,
  JUSTIFICATION_REQUIRED_MESSAGE,
  makeSubmittedSelfAssessment,
} from "../fixtures";

function renderForm({ error = null as string | null } = {}) {
  const onSubmit = vi.fn<(input: GradeAdjustmentInput) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();
  const assessment = makeSubmittedSelfAssessment();

  render(<GradeAdjustmentForm assessment={assessment} error={error} onSubmit={onSubmit} />);

  return {
    user,
    assessment,
    onSubmit,
    gradeInput: screen.getByLabelText(/nota ajustada/i),
    justificationInput: screen.getByLabelText(/justificativa/i),
    saveButton: screen.getByRole("button", { name: /salvar ajuste/i }),
  };
}

// clear antes de digitar: o campo pode vir preenchido com a nota enviada pelo aluno
async function typeGrade(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, grade: string) {
  await user.clear(input);
  await user.type(input, grade);
}

describe("[US15] GradeAdjustmentForm", () => {
  it("Deve exibir a autoavaliação enviada pelo aluno para o tutor analisar", () => {
    const { assessment } = renderForm();

    expect(screen.getByText(assessment.studentName)).toBeInTheDocument();
    // Nota no formato brasileiro, como o restante da interface
    expect(screen.getByText(/6,0/)).toBeInTheDocument();
    expect(screen.getByText(assessment.comment)).toBeInTheDocument();
  });

  it("Deve enviar a nota ajustada como número e a justificativa digitada", async () => {
    const { user, onSubmit, gradeInput, justificationInput, saveButton } = renderForm();

    await typeGrade(user, gradeInput, "8.5");
    await user.type(justificationInput, JUSTIFICATION);
    await user.click(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    // 8.5 e não "8.5": o backend espera um Double
    expect(onSubmit).toHaveBeenCalledWith({ adjustedGrade: 8.5, justification: JUSTIFICATION });
    // Com a justificativa preenchida, a trava não aparece
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // --- TRAVA DA JUSTIFICATIVA ---

  it("[QA] Deve bloquear o salvamento e alertar quando a justificativa não é preenchida", async () => {
    const { user, onSubmit, gradeInput, saveButton } = renderForm();

    await typeGrade(user, gradeInput, "8.5");
    await user.click(saveButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(JUSTIFICATION_REQUIRED_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("[QA] Deve bloquear o salvamento quando a justificativa tem apenas espaços", async () => {
    const { user, onSubmit, gradeInput, justificationInput, saveButton } = renderForm();

    // Mesma regra do @NotBlank do backend: espaços não contam como justificativa
    await typeGrade(user, gradeInput, "8.5");
    await user.type(justificationInput, "   ");
    await user.click(saveButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(JUSTIFICATION_REQUIRED_MESSAGE);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("[QA] Deve salvar e remover o alerta depois que a justificativa é preenchida", async () => {
    const { user, onSubmit, gradeInput, justificationInput, saveButton } = renderForm();

    await typeGrade(user, gradeInput, "8.5");
    await user.click(saveButton);
    expect(await screen.findByRole("alert")).toHaveTextContent(JUSTIFICATION_REQUIRED_MESSAGE);

    // A trava não pode ser permanente: preenchida a justificativa, o mesmo ajuste é salvo
    await user.type(justificationInput, JUSTIFICATION);
    await user.click(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ adjustedGrade: 8.5, justification: JUSTIFICATION });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // --- ERRO DO BACKEND ---

  it("Deve exibir em role=\"alert\" a mensagem recebida quando o ajuste é recusado", () => {
    const { saveButton } = renderForm({ error: FORBIDDEN_TEXT });

    expect(screen.getByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    // O tutor pode corrigir e tentar de novo
    expect(saveButton).toBeEnabled();
  });
});
