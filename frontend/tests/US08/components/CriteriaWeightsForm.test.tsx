import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CriteriaWeightsForm } from "@/components/features/performance-tables/CriteriaWeightsForm";
import type { Criterion, CriterionWeight } from "@/types/performanceTable";
import {
  CONTENT_ID,
  INVALID_SUM_MESSAGE,
  INVALID_SUM_MESSAGE_TEXT,
  makeCriteria,
  PARTICIPATION_ID,
  SELF_ASSESSMENT_ID,
} from "../fixtures";

function renderForm(criteria: Criterion[] = makeCriteria(), errorMessage: string | null = null) {
  const onSubmit = vi.fn<(weights: CriterionWeight[]) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();

  render(<CriteriaWeightsForm criteria={criteria} onSubmit={onSubmit} errorMessage={errorMessage} />);

  return {
    user,
    onSubmit,
    contentInput: screen.getByLabelText(/conteúdo/i),
    participationInput: screen.getByLabelText(/participação/i),
    selfAssessmentInput: screen.getByLabelText(/autoavaliação/i),
    total: screen.getByRole("status"),
    saveButton: screen.getByRole("button", { name: /salvar pesos/i }),
  };
}

async function typeWeight(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, value: string) {
  await user.clear(input);
  await user.type(input, value);
}

// O verde/vermelho segue as classes de cor do Tailwind já usadas no projeto (text-green-*/text-red-*)
function expectGreen(total: HTMLElement) {
  expect(total.className).toMatch(/text-green-/);
  expect(total.className).not.toMatch(/text-red-/);
}

function expectRed(total: HTMLElement) {
  expect(total.className).toMatch(/text-red-/);
  expect(total.className).not.toMatch(/text-green-/);
}

describe("[US08] CriteriaWeightsForm", () => {
  it("should show each saved weight as a percentage and a green 100% total", () => {
    // 0.29 * 100 = 28.999999999999996 em ponto flutuante: a interface precisa mostrar 29 e somar 100%
    const { contentInput, participationInput, selfAssessmentInput, total } = renderForm(makeCriteria(0.35, 0.29, 0.36));

    expect(contentInput).toHaveValue(35);
    expect(participationInput).toHaveValue(29);
    expect(selfAssessmentInput).toHaveValue(36);
    expect(total).toHaveTextContent(/100\s*%/);
    expectGreen(total);
  });

  it("[QA] should sum the typed weights in real time: red at 90% and 110%, green again at 100%", async () => {
    const { user, selfAssessmentInput, total } = renderForm();

    // 40 + 30 + 20 = 90%
    await typeWeight(user, selfAssessmentInput, "20");
    expect(total).toHaveTextContent(/90\s*%/);
    expectRed(total);

    // 40 + 30 + 40 = 110%
    await typeWeight(user, selfAssessmentInput, "40");
    expect(total).toHaveTextContent(/110\s*%/);
    expectRed(total);

    // 40 + 30 + 30 = 100%
    await typeWeight(user, selfAssessmentInput, "30");
    expect(total).toHaveTextContent(/100\s*%/);
    expectGreen(total);
  });

  it("should submit each weight as a decimal linked to its criterion id", async () => {
    const { user, onSubmit, contentInput, participationInput, saveButton } = renderForm();

    await typeWeight(user, contentInput, "50");
    await typeWeight(user, participationInput, "20");
    await user.click(saveButton);

    // A interface trabalha em %, o backend em decimal (0–1)
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith([
      { criterionId: CONTENT_ID, criteriaWeight: 0.5 },
      { criterionId: PARTICIPATION_ID, criteriaWeight: 0.2 },
      { criterionId: SELF_ASSESSMENT_ID, criteriaWeight: 0.3 },
    ]);
  });

  it("[QA] should still submit when the total is not 100%, leaving the refusal (422) to the backend", async () => {
    const { user, onSubmit, selfAssessmentInput, saveButton } = renderForm();

    await typeWeight(user, selfAssessmentInput, "20");
    await user.click(saveButton);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith([
      { criterionId: CONTENT_ID, criteriaWeight: 0.4 },
      { criterionId: PARTICIPATION_ID, criteriaWeight: 0.3 },
      { criterionId: SELF_ASSESSMENT_ID, criteriaWeight: 0.2 },
    ]);
  });

  it("[QA] should show the backend refusal message as an alert", () => {
    renderForm(makeCriteria(), INVALID_SUM_MESSAGE_TEXT);

    expect(screen.getByRole("alert")).toHaveTextContent(INVALID_SUM_MESSAGE);
  });
});
