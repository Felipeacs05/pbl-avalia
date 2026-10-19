import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GradeAdjustmentPanel } from "@/components/features/grade-adjustment/GradeAdjustmentPanel";
import type { GradeAdjustment } from "@/types/gradeAdjustment";
import {
  ASSESSMENT_ID,
  BACKEND_FORBIDDEN_BODY,
  FORBIDDEN_MESSAGE,
  JUSTIFICATION,
  JUSTIFICATION_REQUIRED_MESSAGE,
  makeSubmittedSelfAssessment,
  MODIFIED_BY_TUTOR_ICON,
  ORIGINAL_GRADE,
} from "../fixtures";

const GRADE_ADJUSTMENT_ROUTE = new RegExp(`/api/v1/assessments/${ASSESSMENT_ID}/grade-adjustment$`);

// Estado do fakeBackend: as colunas de auditoria da Assessment
interface StoredAssessment {
  score: number;
  originalGrade: number | null;
  adjustedGrade: number | null;
  justification: string | null;
  modifiedByTutor: boolean;
}

let stored: StoredAssessment;
let requesterIsRoomTutor: boolean;

const untouchedAssessment = (): StoredAssessment => ({
  score: ORIGINAL_GRADE,
  originalGrade: null,
  adjustedGrade: null,
  justification: null,
  modifiedByTutor: false,
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);

  if (init.method !== "PATCH" || !GRADE_ADJUSTMENT_ROUTE.test(url)) {
    return jsonResponse({}, 404);
  }
  const { adjustedGrade, justification } = JSON.parse(String(init.body)) as {
    adjustedGrade: number;
    justification: string | undefined;
  };
  // Mesmas regras do backend que a US15 exercita: @NotBlank da justificativa (400) antes da posse (403)
  if (!justification?.trim()) {
    return jsonResponse(
      {
        status: 400,
        error: "Bad Request",
        message: "Validation failed",
        errors: { justification: "Justificativa é obrigatória" },
      },
      400,
    );
  }
  if (!requesterIsRoomTutor) {
    return jsonResponse(BACKEND_FORBIDDEN_BODY, 403);
  }
  // Como o GradeAdjustmentService: a original só é preservada no primeiro ajuste
  stored = {
    score: adjustedGrade,
    originalGrade: stored.originalGrade ?? stored.score,
    adjustedGrade,
    justification: justification.trim(),
    modifiedByTutor: true,
  };
  const response: GradeAdjustment = {
    assessmentId: ASSESSMENT_ID,
    originalGrade: stored.originalGrade!,
    adjustedGrade,
    justification: stored.justification!,
    modifiedByTutor: true,
  };
  return jsonResponse(response, 200);
}

function requestsWithMethod(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined }));
}

async function adjustThroughForm(user: ReturnType<typeof userEvent.setup>, grade: string, justification: string) {
  await user.clear(screen.getByLabelText(/nota ajustada/i));
  await user.type(screen.getByLabelText(/nota ajustada/i), grade);
  const justificationInput = screen.getByLabelText(/justificativa/i);
  await user.clear(justificationInput);
  if (justification) await user.type(justificationInput, justification);
  await user.click(screen.getByRole("button", { name: /salvar ajuste/i }));
}

function renderPanel() {
  const user = userEvent.setup();
  render(<GradeAdjustmentPanel assessment={makeSubmittedSelfAssessment()} />);
  return { user };
}

beforeEach(() => {
  stored = untouchedAssessment();
  requesterIsRoomTutor = true;
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US15] Integração do GradeAdjustmentPanel", () => {
  it("Deve enviar o PATCH do ajuste e exibir a nota gravada pelo servidor com o ícone \"Nota Modificada pelo Tutor\"", async () => {
    const { user } = renderPanel();
    // Antes do ajuste, nada indica modificação
    expect(screen.queryByRole("img", { name: MODIFIED_BY_TUTOR_ICON })).not.toBeInTheDocument();

    await adjustThroughForm(user, "8.5", JUSTIFICATION);

    expect(await screen.findByRole("img", { name: MODIFIED_BY_TUTOR_ICON })).toBeInTheDocument();
    expect(screen.getByText(/8,5/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    const patches = requestsWithMethod("PATCH");
    expect(patches).toHaveLength(1);
    expect(patches[0].url).toMatch(GRADE_ADJUSTMENT_ROUTE);
    expect(patches[0].body).toEqual({ adjustedGrade: 8.5, justification: JUSTIFICATION });
    // O fakeBackend gravou a auditoria que a tela reflete
    expect(stored).toEqual({
      score: 8.5,
      originalGrade: ORIGINAL_GRADE,
      adjustedGrade: 8.5,
      justification: JUSTIFICATION,
      modifiedByTutor: true,
    });
  });

  it("[QA] Deve travar o salvamento sem justificativa sem chamar o backend e salvar depois que ela é preenchida", async () => {
    const { user } = renderPanel();

    // 1ª tentativa: justificativa vazia
    await adjustThroughForm(user, "8.5", "");

    expect(await screen.findByRole("alert")).toHaveTextContent(JUSTIFICATION_REQUIRED_MESSAGE);
    expect(requestsWithMethod("PATCH")).toHaveLength(0);
    expect(stored).toEqual(untouchedAssessment());

    // 2ª tentativa: só espaços, que o @NotBlank do backend também recusaria
    await adjustThroughForm(user, "8.5", "   ");

    expect(screen.getByRole("alert")).toHaveTextContent(JUSTIFICATION_REQUIRED_MESSAGE);
    expect(requestsWithMethod("PATCH")).toHaveLength(0);
    expect(stored).toEqual(untouchedAssessment());
    expect(screen.queryByRole("img", { name: MODIFIED_BY_TUTOR_ICON })).not.toBeInTheDocument();

    // Com a justificativa preenchida, a trava libera e o ajuste é gravado
    await adjustThroughForm(user, "8.5", JUSTIFICATION);

    expect(await screen.findByRole("img", { name: MODIFIED_BY_TUTOR_ICON })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requestsWithMethod("PATCH")).toHaveLength(1);
    expect(stored).toMatchObject({ adjustedGrade: 8.5, justification: JUSTIFICATION, modifiedByTutor: true });
  });

  it("Deve exibir a recusa em português e manter a nota intacta quando o usuário não é o tutor da sala", async () => {
    requesterIsRoomTutor = false;
    const { user } = renderPanel();

    await adjustThroughForm(user, "10", "Quero nota máxima");

    expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    // A mensagem genérica em inglês do backend não chega à tela
    expect(screen.getByRole("alert")).not.toHaveTextContent(BACKEND_FORBIDDEN_BODY.message);
    expect(screen.queryByRole("img", { name: MODIFIED_BY_TUTOR_ICON })).not.toBeInTheDocument();
    // A tentativa chegou ao backend, que recusou sem gravar
    const refused = requestsWithMethod("PATCH");
    expect(refused).toHaveLength(1);
    expect(refused[0].body).toEqual({ adjustedGrade: 10, justification: "Quero nota máxima" });
    expect(stored).toEqual(untouchedAssessment());

    // Depois da recusa, um valor diferente prova que a segunda gravação aconteceu
    requesterIsRoomTutor = true;
    await adjustThroughForm(user, "7", JUSTIFICATION);

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(await screen.findByRole("img", { name: MODIFIED_BY_TUTOR_ICON })).toBeInTheDocument();
    expect(screen.getByText(/7,0/)).toBeInTheDocument();
    expect(requestsWithMethod("PATCH")).toHaveLength(2);
    expect(stored).toEqual({
      score: 7,
      originalGrade: ORIGINAL_GRADE,
      adjustedGrade: 7,
      justification: JUSTIFICATION,
      modifiedByTutor: true,
    });
  });
});
