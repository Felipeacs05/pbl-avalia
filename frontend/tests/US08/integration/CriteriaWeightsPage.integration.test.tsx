import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CriteriaWeightsPage } from "@/components/features/performance-tables/CriteriaWeightsPage";
import type { CriterionWeight, PerformanceTable } from "@/types/performanceTable";
import {
  CONTENT_ID,
  INVALID_SUM_MESSAGE,
  INVALID_SUM_MESSAGE_TEXT,
  makePerformanceTable,
  PARTICIPATION_ID,
  PERFORMANCE_TABLE_ID,
  SELF_ASSESSMENT_ID,
} from "../fixtures";

const TABLE_ROUTE = new RegExp(`/api/v1/performance-tables/${PERFORMANCE_TABLE_ID}$`);
const WEIGHTS_ROUTE = new RegExp(`/api/v1/performance-tables/${PERFORMANCE_TABLE_ID}/criteria/weights$`);

let table: PerformanceTable;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const method = init.method ?? "GET";

  if (method === "GET" && TABLE_ROUTE.test(url)) {
    return jsonResponse(table, 200);
  }
  if (method === "PUT" && WEIGHTS_ROUTE.test(url)) {
    const { weights } = JSON.parse(String(init.body)) as { weights: CriterionWeight[] };
    const sum = weights.reduce((total, weight) => total + weight.criteriaWeight, 0);
    // Mesma regra do backend: soma diferente de 1.0 (com tolerância de ponto flutuante) é recusada com 422
    if (Math.abs(sum - 1) > 1e-9) {
      return jsonResponse({ status: 422, error: "Unprocessable Content", message: INVALID_SUM_MESSAGE_TEXT }, 422);
    }
    table = {
      ...table,
      criteriaList: table.criteriaList.map((criterion) => ({
        ...criterion,
        criteriaWeight: weights.find((weight) => weight.criterionId === criterion.criterionId)!.criteriaWeight,
      })),
    };
    return jsonResponse(table, 200);
  }
  return jsonResponse({}, 404);
}

function requestsWithMethod(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined }));
}

function savedWeights() {
  return Object.fromEntries(table.criteriaList.map((criterion) => [criterion.criterionId, criterion.criteriaWeight]));
}

async function renderPage() {
  const user = userEvent.setup();
  render(<CriteriaWeightsPage performanceTableId={PERFORMANCE_TABLE_ID} />);
  await screen.findByLabelText(/autoavaliação/i);
  return {
    user,
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

beforeEach(() => {
  table = makePerformanceTable();
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US08] Criteria weights page integration", () => {
  it("should GET the table from the backend and show each criterion weight as a percentage with a green 100% total", async () => {
    const { contentInput, participationInput, selfAssessmentInput, total } = await renderPage();

    expect(requestsWithMethod("GET")[0].url).toMatch(TABLE_ROUTE);
    expect(contentInput).toHaveValue(40);
    expect(participationInput).toHaveValue(30);
    expect(selfAssessmentInput).toHaveValue(30);
    expect(total).toHaveTextContent(/100\s*%/);
    expectGreen(total);
  });

  it("should PUT each typed weight as a decimal to the table's weights route and keep the weights saved by the backend", async () => {
    const { user, contentInput, participationInput, saveButton } = await renderPage();

    await typeWeight(user, contentInput, "50");
    await typeWeight(user, participationInput, "20");
    await user.click(saveButton);

    await waitFor(() => expect(savedWeights()).toEqual({ [CONTENT_ID]: 0.5, [PARTICIPATION_ID]: 0.2, [SELF_ASSESSMENT_ID]: 0.3 }));
    const puts = requestsWithMethod("PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0].url).toMatch(WEIGHTS_ROUTE);
    expect(puts[0].body).toEqual({
      weights: [
        { criterionId: CONTENT_ID, criteriaWeight: 0.5 },
        { criterionId: PARTICIPATION_ID, criteriaWeight: 0.2 },
        { criterionId: SELF_ASSESSMENT_ID, criteriaWeight: 0.3 },
      ],
    });
    // Depois de salvar, a tabela é buscada de novo e a tela continua mostrando os pesos gravados
    await waitFor(() => expect(requestsWithMethod("GET")).toHaveLength(2));
    expect(screen.getByLabelText(/conteúdo/i)).toHaveValue(50);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    { sum: 90, typed: "20", sent: 0.2 },
    { sum: 110, typed: "40", sent: 0.4 },
  ])("[QA] should show a red $sum% total, send it, and show the backend 422 message keeping the saved weights", async ({ sum, typed, sent }) => {
    const { user, selfAssessmentInput, total, saveButton } = await renderPage();

    await typeWeight(user, selfAssessmentInput, typed);
    expect(total).toHaveTextContent(new RegExp(`${sum}\\s*%`));
    expectRed(total);

    await user.click(saveButton);

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_SUM_MESSAGE);
    expect(requestsWithMethod("PUT")[0].body.weights[2]).toEqual({ criterionId: SELF_ASSESSMENT_ID, criteriaWeight: sent });
    expect(savedWeights()).toEqual({ [CONTENT_ID]: 0.4, [PARTICIPATION_ID]: 0.3, [SELF_ASSESSMENT_ID]: 0.3 });
    expectRed(total);
  });

  it("[QA] should save a 100% formula after a refusal, turning green and clearing the 422 message", async () => {
    const { user, contentInput, selfAssessmentInput, total, saveButton } = await renderPage();

    // 90% (40 + 30 + 20): recusado pelo backend
    await typeWeight(user, selfAssessmentInput, "20");
    await user.click(saveButton);
    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_SUM_MESSAGE);

    // 100% (50 + 30 + 20): fórmula diferente da inicial, para provar que o segundo PUT gravou
    await typeWeight(user, contentInput, "50");
    expectGreen(total);
    await user.click(saveButton);

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(requestsWithMethod("PUT")).toHaveLength(2);
    expect(savedWeights()).toEqual({ [CONTENT_ID]: 0.5, [PARTICIPATION_ID]: 0.3, [SELF_ASSESSMENT_ID]: 0.2 });
  });
});
