import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { StudentFeedbacksPanel } from "@/components/features/feedbacks/StudentFeedbacksPanel";
import {
  BACKEND_FORBIDDEN_BODY,
  CREATED_AT,
  CREATED_AT_LABEL,
  EMPTY_MESSAGE,
  FORBIDDEN_MESSAGE,
  OLDER_CREATED_AT,
  OTHER_STUDENT_ID,
  STUDENT_ID,
  TUTOR_NAME,
} from "../fixtures";

const STUDENT_FEEDBACKS_ROUTE = /\/api\/v1\/students\/([^/?]+)\/feedbacks$/;

// Feedback como está no banco: com os campos internos que o FeedbackDTO não expõe
interface StoredFeedback {
  id: string;
  studentId: string;
  tutorName: string;
  problemTitle: string;
  grade: number;
  text: string;
  createdAt: string;
}

const B_TEXT = "Feedback reservado ao Bruno";

// Estado do fakeBackend: os feedbacks gravados e quem está logado
let stored: StoredFeedback[];
let loggedStudentId: string;
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const studentId = url.match(STUDENT_FEEDBACKS_ROUTE)?.[1];

  if ((init.method ?? "GET") !== "GET" || !studentId) {
    return Promise.resolve(jsonResponse({}, 404));
  }
  const respond = () => {
    // Mesma regra do FeedbackSecurity: o aluno só lê os próprios feedbacks (403 com JSON genérico)
    if (studentId !== loggedStudentId) {
      return jsonResponse(BACKEND_FORBIDDEN_BODY, 403);
    }
    // Como o FeedbackRetrievalService: mais recente primeiro, mapeado para o FeedbackDTO
    const content = stored
      .filter((feedback) => feedback.studentId === studentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ tutorName, problemTitle, grade, text, createdAt }) => ({ tutorName, problemTitle, grade, text, createdAt }));
    return jsonResponse(
      { content, page: 0, size: 20, totalElements: content.length, totalPages: content.length === 0 ? 0 : 1 },
      200,
    );
  };
  // Rede lenta: a resposta só sai quando o teste libera
  return networkIsSlow
    ? new Promise((resolve) => heldResponses.push(() => resolve(respond())))
    : Promise.resolve(respond());
}

function requestsWithMethod(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined }));
}

async function releaseHeldResponses() {
  await act(async () => {
    heldResponses.splice(0).forEach((release) => release());
  });
}

function renderPanel(studentId = STUDENT_ID) {
  return render(<StudentFeedbacksPanel studentId={studentId} />);
}

beforeEach(() => {
  // Alice tem dois feedbacks, gravados fora de ordem; Bruno tem um
  stored = [
    {
      id: "f-old", studentId: STUDENT_ID, tutorName: TUTOR_NAME,
      problemTitle: "Problema 2", grade: 7, text: "Precisa participar mais da discussão", createdAt: OLDER_CREATED_AT,
    },
    {
      id: "f-new", studentId: STUDENT_ID, tutorName: TUTOR_NAME,
      problemTitle: "Problema 1", grade: 8.5, text: "Excelente participação nas sessões", createdAt: CREATED_AT,
    },
    {
      id: "f-bruno", studentId: OTHER_STUDENT_ID, tutorName: TUTOR_NAME,
      problemTitle: "Problema 1", grade: 4, text: B_TEXT, createdAt: CREATED_AT,
    },
  ];
  loggedStudentId = STUDENT_ID;
  networkIsSlow = false;
  heldResponses = [];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US17] Integração do StudentFeedbacksPanel", () => {
  it("Deve buscar com GET os feedbacks do aluno logado e exibi-los com o nome do tutor, na ordem do backend", async () => {
    networkIsSlow = true;
    renderPanel();

    // Antes da resposta: carregando, sem afirmar que a lista está vazia
    expect(screen.getByRole("status")).toHaveTextContent(/carregando/i);
    expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();

    const gets = requestsWithMethod("GET");
    expect(gets).toHaveLength(1);
    expect(gets[0].url).toMatch(new RegExp(`/api/v1/students/${STUDENT_ID}/feedbacks$`));

    await releaseHeldResponses();

    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // Gravados fora de ordem: a tela segue a ordem devolvida pelo servidor
    expect(items[0]).toHaveTextContent("Problema 1");
    expect(items[0]).toHaveTextContent(TUTOR_NAME);
    expect(items[0]).toHaveTextContent(/8,5/);
    expect(items[0]).toHaveTextContent(CREATED_AT_LABEL);
    expect(items[1]).toHaveTextContent("Problema 2");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("[QA] Deve exibir a negativa em português e nenhum feedback quando o aluno A abre o id do aluno B", async () => {
    renderPanel(OTHER_STUDENT_ID);

    expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    // A mensagem genérica em inglês do backend não chega à tela
    expect(screen.getByRole("alert")).not.toHaveTextContent(BACKEND_FORBIDDEN_BODY.message);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText(B_TEXT)).not.toBeInTheDocument();
    // Uma negativa não é "lista vazia"
    expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();
    // A tentativa chegou ao backend, que negou
    const gets = requestsWithMethod("GET");
    expect(gets).toHaveLength(1);
    expect(gets[0].url).toMatch(new RegExp(`/api/v1/students/${OTHER_STUDENT_ID}/feedbacks$`));
  });

  it("[QA] Deve descartar a própria lista ao trocar para o id de outro aluno e recuperá-la ao voltar", async () => {
    const { rerender } = renderPanel();
    expect(await screen.findAllByRole("listitem")).toHaveLength(2);

    // Troca do id na URL para o do colega
    rerender(<StudentFeedbacksPanel studentId={OTHER_STUDENT_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText(B_TEXT)).not.toBeInTheDocument();

    // De volta ao próprio id: a busca é refeita e a lista volta, sem o alerta
    rerender(<StudentFeedbacksPanel studentId={STUDENT_ID} />);

    expect(await screen.findAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requestsWithMethod("GET").map((request) => request.url.match(STUDENT_FEEDBACKS_ROUTE)?.[1])).toEqual([
      STUDENT_ID,
      OTHER_STUDENT_ID,
      STUDENT_ID,
    ]);
  });

  it("Deve avisar que ainda não há feedbacks quando o aluno logado não recebeu nenhum", async () => {
    stored = stored.filter((feedback) => feedback.studentId !== STUDENT_ID);
    renderPanel();

    expect(await screen.findByText(EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(requestsWithMethod("GET")).toHaveLength(1);
  });
});
