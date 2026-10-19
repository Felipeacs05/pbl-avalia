import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BehaviorRecordsPage } from "@/components/features/behavior-records/BehaviorRecordsPage";
import type { BehaviorRecord } from "@/types/behaviorRecord";
import {
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  FREE_TEXT,
  makeOtherStudent,
  makeOtherTag,
  makeStudent,
  makeTag,
  OTHER_STUDENT_ID,
  OTHER_TAG_CONFIRMATION,
  OTHER_TAG_ID,
  RECORD_ID,
  RECORDED_AT,
  SESSION_ID,
  STUDENT_ID,
  TAG_CONFIRMATION,
  TAG_ID,
  TEXT_AT_LIMIT,
  TEXT_CONFIRMATION,
  TEXT_LIMIT,
  TEXT_OVER_LIMIT,
  TEXT_TOO_LONG_MESSAGE,
} from "../fixtures";

const TAGS_ROUTE = /\/api\/v1\/behavior-tags$/;
const RECORDS_ROUTE = new RegExp(`/api/v1/sessions/${SESSION_ID}/students/([^/]+)/behavior-records$`);
const STUDENT_ROUTE = new RegExp(`/api/v1/sessions/${SESSION_ID}/students/${STUDENT_ID}/behavior-records$`);

// Estado do fakeBackend: cada POST aceito vira uma linha nova, como no backend (sem unicidade)
let records: BehaviorRecord[];
let requesterIsRoomTutor: boolean;
let networkIsSlow: boolean;
let heldResponses: Array<() => void>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Rede lenta: a resposta só sai quando o teste libera
function throttled(respond: () => Response): Promise<Response> {
  return new Promise((resolve) => {
    heldResponses.push(() => resolve(respond()));
  });
}

function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const method = init.method ?? "GET";

  if (method === "GET" && TAGS_ROUTE.test(url)) {
    return Promise.resolve(jsonResponse([makeTag(), makeOtherTag()], 200));
  }

  const studentId = url.match(RECORDS_ROUTE)?.[1];
  if (method !== "POST" || !studentId) {
    return Promise.resolve(jsonResponse({}, 404));
  }

  const respond = () => {
    // Mesma regra do backend: só o tutor da sala registra; o 403 é texto puro
    if (!requesterIsRoomTutor) {
      return new Response(FORBIDDEN_TEXT, { status: 403 });
    }
    const body = JSON.parse(String(init.body)) as { tagId?: string; text?: string };
    // Mesma validação do backend (@Size(max = 500)): se o front deixar passar, a resposta é 400
    if (body.text !== undefined && body.text.length > TEXT_LIMIT) {
      return jsonResponse(
        { message: "Validation failed", errors: { text: "O texto deve ter no máximo 500 caracteres." } },
        400,
      );
    }
    const student = [makeStudent(), makeOtherStudent()].find((s) => s.id === studentId)!;
    const tag = [makeTag(), makeOtherTag()].find((t) => t.id === body.tagId);
    // Nomes e horário são do servidor
    const saved: BehaviorRecord = {
      id: `${RECORD_ID}-${records.length + 1}`,
      sessionId: SESSION_ID,
      studentId,
      studentName: student.name,
      tagId: tag?.id ?? null,
      tagName: tag?.name ?? null,
      text: body.text ?? null,
      recordedAt: RECORDED_AT,
    };
    records.push(saved);
    return jsonResponse(saved, 201);
  };
  return networkIsSlow ? throttled(respond) : Promise.resolve(respond());
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

function panelOf(name: string) {
  return within(screen.getByRole("dialog", { name: new RegExp(name, "i") }));
}

// 1º toque: o aluno na lista; o painel só aparece depois que as tags chegaram do backend
async function selectStudent(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name }));
  return panelOf(name);
}

// Colar em vez de digitar: 500 eventos de tecla deixariam o teste lento sem testar nada a mais
async function fillText(user: ReturnType<typeof userEvent.setup>, input: HTMLElement, text: string) {
  await user.clear(input);
  await user.click(input);
  await user.paste(text);
}

async function renderPage() {
  const user = userEvent.setup();
  render(<BehaviorRecordsPage sessionId={SESSION_ID} students={[makeStudent(), makeOtherStudent()]} />);
  // A lista vem por props; as tags vêm do backend antes do primeiro toque
  await waitFor(() => expect(requestsWithMethod("GET")).toHaveLength(1));
  return { user };
}

beforeEach(() => {
  records = [];
  requesterIsRoomTutor = true;
  networkIsSlow = false;
  heldResponses = [];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US11] Integração da BehaviorRecordsPage", () => {
  // --- REGISTRO POR TAG ---

  it("Deve registrar a tag em 2 toques, confirmar o registro e voltar à lista", async () => {
    const { user } = await renderPage();

    // As tags vêm da rota de listagem, como na US05 e na US08
    expect(requestsWithMethod("GET")[0].url).toMatch(TAGS_ROUTE);
    const panel = await selectStudent(user, "Alice Souza");
    // As tags do painel são as do backend, na ordem recebida
    expect(panel.getAllByRole("button", { name: /^(Atraso|Celular fora de contexto)$/ }).map((b) => b.textContent))
      .toEqual(["Atraso", "Celular fora de contexto"]);

    await user.click(panel.getByRole("button", { name: "Atraso" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(TAG_CONFIRMATION);
    // Só 2 toques: nenhum POST além do da tag, e nenhuma confirmação intermediária
    const posts = requestsWithMethod("POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toMatch(STUDENT_ROUTE);
    expect(posts[0].body).toEqual({ tagId: TAG_ID });
    // O fakeBackend gravou: o que a tela confirmou veio da resposta
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ studentId: STUDENT_ID, tagId: TAG_ID, text: null });
  });

  it("Deve acumular um registro por toque e direcionar cada um ao aluno selecionado, sem buscar as tags de novo", async () => {
    const { user } = await renderPage();

    await user.click((await selectStudent(user, "Alice Souza")).getByRole("button", { name: "Atraso" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click((await selectStudent(user, "Alice Souza")).getByRole("button", { name: "Atraso" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // O painel aberto agora é de outro aluno: o registro não pode ir para quem foi selecionado antes
    await user.click((await selectStudent(user, "Bruno Lima")).getByRole("button", { name: "Celular fora de contexto" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(requestsWithMethod("POST").map((post) => post.body)).toEqual([
      { tagId: TAG_ID },
      { tagId: TAG_ID },
      { tagId: OTHER_TAG_ID },
    ]);
    expect(records.map((r) => [r.studentId, r.tagId])).toEqual([
      [STUDENT_ID, TAG_ID],
      [STUDENT_ID, TAG_ID],
      [OTHER_STUDENT_ID, OTHER_TAG_ID],
    ]);
    // As tags são carregadas uma vez por tela, e não a cada aluno aberto
    expect(requestsWithMethod("GET")).toHaveLength(1);
  });

  // --- REGISTRO POR TEXTO LIVRE ---

  it("Deve gravar o texto livre no perfil do aluno selecionado e confirmar a observação", async () => {
    const { user } = await renderPage();

    const panel = await selectStudent(user, "Alice Souza");
    await user.type(panel.getByLabelText(/observação/i), FREE_TEXT);
    await user.click(panel.getByRole("button", { name: /salvar observação/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(TEXT_CONFIRMATION);
    const posts = requestsWithMethod("POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toMatch(STUDENT_ROUTE);
    expect(posts[0].body).toEqual({ text: FREE_TEXT });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ studentId: STUDENT_ID, tagId: null, text: FREE_TEXT });
  });

  // --- LIMITE DO TEXTO LIVRE ---

  it("[QA] Deve bloquear no front um texto acima de 500 caracteres sem enviar a requisição e, reduzido ao limite, gravá-lo inteiro", async () => {
    const { user } = await renderPage();
    const panel = await selectStudent(user, "Alice Souza");
    const textInput = panel.getByLabelText(/observação/i);
    const saveButton = panel.getByRole("button", { name: /salvar observação/i });

    // 1) Acima do limite: aviso no painel e envio bloqueado
    await fillText(user, textInput, TEXT_OVER_LIMIT);
    expect(panel.getByRole("alert")).toHaveTextContent(TEXT_TOO_LONG_MESSAGE);
    expect(saveButton).toBeDisabled();
    await user.click(saveButton);

    // Nenhuma requisição saiu: o 400 do backend nem chega a ser necessário
    expect(requestsWithMethod("POST")).toHaveLength(0);
    expect(records).toHaveLength(0);
    // O painel continua aberto com o texto, para o tutor cortar o excesso
    expect(textInput).toHaveValue(TEXT_OVER_LIMIT);

    // 2) Reduzido a exatamente 500 caracteres: aceito e gravado sem corte
    await fillText(user, textInput, TEXT_AT_LIMIT);
    expect(panel.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(saveButton);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const posts = requestsWithMethod("POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ text: TEXT_AT_LIMIT });
    expect(records).toHaveLength(1);
    expect(records[0].text).toBe(TEXT_AT_LIMIT);
  });

  // --- SALVAMENTO E RECUSA ---

  it("Deve travar o painel enquanto o registro está pendente, gravando um único registro mesmo com toque duplo", async () => {
    networkIsSlow = true;
    const { user } = await renderPage();
    const panel = await selectStudent(user, "Alice Souza");

    await user.click(panel.getByRole("button", { name: "Atraso" }));
    // O segundo toque cai com a requisição ainda pendente
    await user.click(panel.getByRole("button", { name: "Atraso" }));

    expect(requestsWithMethod("POST")).toHaveLength(1);
    expect(panel.getByRole("button", { name: "Atraso" })).toBeDisabled();
    expect(panel.getByRole("button", { name: "Celular fora de contexto" })).toBeDisabled();
    expect(records).toHaveLength(0);
    // Sem resposta, nada é confirmado e o painel não fecha: a confirmação depende do servidor
    expect(screen.getByRole("dialog", { name: /alice souza/i })).toBeInTheDocument();
    expect(screen.queryByText(TAG_CONFIRMATION)).not.toBeInTheDocument();

    await releaseHeldResponses();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(TAG_CONFIRMATION);
    expect(records).toHaveLength(1);
  });

  it("Deve exibir a recusa do backend no painel aberto, sem confirmar nada, e gravar na nova tentativa", async () => {
    requesterIsRoomTutor = false;
    const { user } = await renderPage();
    const panel = await selectStudent(user, "Alice Souza");

    await user.click(panel.getByRole("button", { name: "Atraso" }));

    expect(await panel.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    // O painel continua aberto, com as tags disponíveis, e nada foi confirmado
    expect(screen.getByRole("dialog", { name: /alice souza/i })).toBeInTheDocument();
    expect(panel.getByRole("button", { name: "Celular fora de contexto" })).toBeEnabled();
    expect(screen.queryByText(TAG_CONFIRMATION)).not.toBeInTheDocument();
    // A tentativa chegou ao backend, que recusou sem gravar
    const refused = requestsWithMethod("POST");
    expect(refused).toHaveLength(1);
    expect(refused[0].url).toMatch(STUDENT_ROUTE);
    expect(refused[0].body).toEqual({ tagId: TAG_ID });
    expect(records).toHaveLength(0);

    // Uma tag diferente da recusada prova que a segunda gravação aconteceu
    requesterIsRoomTutor = true;
    await user.click(panel.getByRole("button", { name: "Celular fora de contexto" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent(OTHER_TAG_CONFIRMATION);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ studentId: STUDENT_ID, tagId: OTHER_TAG_ID });
  });
});
