import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackPanel } from "@/components/features/feedbacks/FeedbackPanel";
import type { Feedback, FeedbackStudent } from "@/types/feedback";
import {
  BACKEND_FORBIDDEN_BODY,
  CLASS_SIZE,
  FORBIDDEN_MESSAGE,
  makeClassStudents,
  makeOtherStudent,
  makeStudent,
  OTHER_STUDENT_ID,
  PROBLEM_ID,
  TEXT,
  TEXT_REQUIRED_MESSAGE,
  TEXT_REQUIRED_TEXT,
  TIMEOUT_MESSAGE,
} from "../fixtures";

const FEEDBACKS_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}/feedbacks$`);
const BATCH_ROUTE = new RegExp(`/api/v1/problems/${PROBLEM_ID}/feedbacks/batch$`);

interface FeedbackItem {
  studentId: string;
  grade: number | null;
  text: string;
}

// Estado do fakeBackend: os feedbacks gravados do problema
let saved: Feedback[];
let requesterIsRoomTutor: boolean;
let gatewayTimesOut: boolean;
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Regra do FeedbackRequest que a US16 exercita: @NotBlank no texto
function invalidField(item: FeedbackItem): Record<string, string> | null {
  return item.text?.trim() ? null : { text: TEXT_REQUIRED_TEXT };
}

function persist(items: FeedbackItem[]): Feedback[] {
  const created = items.map((item) => ({
    id: `${saved.length}-${item.studentId}`,
    problemId: PROBLEM_ID,
    studentId: item.studentId,
    grade: item.grade as number,
    // Como o FeedbackService: o texto é gravado sem os espaços das pontas
    text: item.text.trim(),
  }));
  saved.push(...created);
  return created;
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const isBatch = BATCH_ROUTE.test(url);

  if (init.method !== "POST" || (!isBatch && !FEEDBACKS_ROUTE.test(url))) {
    return Promise.resolve(jsonResponse({}, 404));
  }
  const respond = () => {
    // 504 vem do gateway, antes de o backend responder: HTML e nada gravado
    if (isBatch && gatewayTimesOut) {
      return new Response("<html><body>504 Gateway Time-out</body></html>", {
        status: 504,
        headers: { "Content-Type": "text/html" },
      });
    }
    const body = JSON.parse(String(init.body));
    const items: FeedbackItem[] = isBatch ? body.feedbacks : [body];
    // Um item inválido rejeita o lote inteiro (validação antes da posse, como no backend)
    const errors = items.map(invalidField).find(Boolean);
    if (errors) {
      return jsonResponse({ status: 400, error: "Bad Request", message: "Validation failed", errors }, 400);
    }
    if (!requesterIsRoomTutor) {
      return jsonResponse(BACKEND_FORBIDDEN_BODY, 403);
    }
    const created = persist(items);
    return jsonResponse(isBatch ? created : created[0], 201);
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

// Separa os POSTs individuais dos de lote: o critério de Desempenho depende dessa contagem
function postsTo(route: RegExp) {
  return requestsWithMethod("POST").filter((request) => route.test(request.url));
}

async function releaseHeldResponses() {
  await act(async () => {
    heldResponses.splice(0).forEach((release) => release());
  });
}

async function writeFeedback(user: ReturnType<typeof userEvent.setup>, grade: string, text: string) {
  await user.clear(screen.getByLabelText(/nota/i));
  if (grade) await user.type(screen.getByLabelText(/nota/i), grade);
  await user.clear(screen.getByLabelText(/feedback/i));
  if (text) await user.type(screen.getByLabelText(/feedback/i), text);
}

function sendToClassButton() {
  return screen.getByRole("button", { name: /enviar para a turma/i });
}

function sendToStudentButton() {
  return screen.getByRole("button", { name: /enviar para o aluno/i });
}

function renderPanel(students: FeedbackStudent[] = [makeStudent(), makeOtherStudent()]) {
  const user = userEvent.setup();
  render(<FeedbackPanel problemId={PROBLEM_ID} students={students} />);
  return { user };
}

beforeEach(() => {
  saved = [];
  requesterIsRoomTutor = true;
  gatewayTimesOut = false;
  networkIsSlow = false;
  heldResponses = [];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US16] Integração do FeedbackPanel", () => {
  it("Deve enviar o feedback do aluno escolhido na rota individual e confirmar com o que o servidor gravou", async () => {
    const { user } = renderPanel();

    await user.selectOptions(screen.getByLabelText(/aluno/i), "Bruno Lima");
    await writeFeedback(user, "8.5", `  ${TEXT}  `);
    await user.click(sendToStudentButton());

    expect(await screen.findByRole("status")).toHaveTextContent(/feedback enviado para 1 aluno\b/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    const posts = postsTo(FEEDBACKS_ROUTE);
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ studentId: OTHER_STUDENT_ID, grade: 8.5, text: `  ${TEXT}  ` });
    expect(postsTo(BATCH_ROUTE)).toHaveLength(0);
    // O fakeBackend gravou só o aluno escolhido, com o texto aparado pelo servidor
    expect(saved).toEqual([expect.objectContaining({ studentId: OTHER_STUDENT_ID, grade: 8.5, text: TEXT })]);
  });

  it("[QA] Deve disparar a sala cheia em uma única requisição de lote, bloquear novo envio até a resposta e confirmar todos os alunos", async () => {
    networkIsSlow = true;
    const students = makeClassStudents();
    const { user } = renderPanel(students);

    await writeFeedback(user, "8", TEXT);
    await user.click(sendToClassButton());

    // Critério de Desempenho: um único POST de lote com um item por aluno, nenhum envio individual
    const batches = postsTo(BATCH_ROUTE);
    expect(batches).toHaveLength(1);
    expect(batches[0].body).toEqual({
      feedbacks: students.map((student) => ({ studentId: student.id, grade: 8, text: TEXT })),
    });
    expect(postsTo(FEEDBACKS_ROUTE)).toHaveLength(0);

    // Enquanto o lote não termina, um segundo disparo dobraria a carga
    await waitFor(() => expect(sendToClassButton()).toBeDisabled());
    expect(sendToStudentButton()).toBeDisabled();
    await user.click(sendToClassButton());
    expect(postsTo(BATCH_ROUTE)).toHaveLength(1);
    expect(saved).toHaveLength(0);

    await releaseHeldResponses();

    expect(await screen.findByRole("status")).toHaveTextContent(new RegExp(`feedback enviado para ${CLASS_SIZE} alunos`, "i"));
    expect(sendToClassButton()).toBeEnabled();
    expect(saved.map((feedback) => feedback.studentId)).toEqual(students.map((student) => student.id));
  });

  it("[QA] Deve avisar o tempo esgotado quando o lote recebe 504, sem gravar nada, e salvar no reenvio", async () => {
    gatewayTimesOut = true;
    const students = makeClassStudents();
    const { user } = renderPanel(students);

    await writeFeedback(user, "8", TEXT);
    await user.click(sendToClassButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(TIMEOUT_MESSAGE);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    // O tutor não fica preso: o envio volta a ficar disponível
    expect(sendToClassButton()).toBeEnabled();
    expect(saved).toHaveLength(0);

    gatewayTimesOut = false;
    await user.click(sendToClassButton());

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(new RegExp(`feedback enviado para ${CLASS_SIZE} alunos`, "i"));
    expect(postsTo(BATCH_ROUTE)).toHaveLength(2);
    expect(saved).toHaveLength(CLASS_SIZE);
  });

  it("Deve exibir a recusa do backend e não gravar nada quando o texto está em branco", async () => {
    const { user } = renderPanel();

    await writeFeedback(user, "8", "   ");
    await user.click(sendToClassButton());

    // Sem trava no front: o 400 do backend chega à tela com a mensagem do campo
    expect(await screen.findByRole("alert")).toHaveTextContent(TEXT_REQUIRED_MESSAGE);
    const refused = postsTo(BATCH_ROUTE);
    expect(refused).toHaveLength(1);
    expect(refused[0].body.feedbacks).toHaveLength(2);
    expect(saved).toHaveLength(0);
  });

  it("Deve exibir a recusa em português e não gravar nada quando o usuário não é o tutor da sala", async () => {
    requesterIsRoomTutor = false;
    const { user } = renderPanel();

    await writeFeedback(user, "10", "Quero enviar");
    await user.click(sendToStudentButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    // A mensagem genérica em inglês do backend não chega à tela
    expect(screen.getByRole("alert")).not.toHaveTextContent(BACKEND_FORBIDDEN_BODY.message);
    expect(postsTo(FEEDBACKS_ROUTE)).toHaveLength(1);
    expect(saved).toHaveLength(0);

    // Depois da recusa, outro texto prova que a segunda gravação aconteceu
    requesterIsRoomTutor = true;
    await writeFeedback(user, "7", TEXT);
    await user.click(sendToStudentButton());

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(/feedback enviado para 1 aluno\b/i);
    expect(saved).toEqual([expect.objectContaining({ grade: 7, text: TEXT })]);
  });
});
