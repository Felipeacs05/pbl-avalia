import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DisciplinesPage from "@/app/teacher-rooms/[id]/disciplines/page";
import {
  ACCESS_REVOKED_WARNING,
  ALICE,
  BACKEND_FORBIDDEN_TEXT,
  BRUNO,
  errorBody,
  FORBIDDEN_MESSAGE,
  HISTORY_PRESERVED_WARNING,
  jsonResponse,
  NOT_IN_ROOM_TEXT,
  REMOVED_MESSAGE,
  removeButtonName,
  removeRoute,
  ROOM,
  ROOM_ID,
  STORED_TOKEN,
  TUTOR,
} from "../fixtures";

// INTEGRAÇÃO da aba "Pessoas" da sala, com todas as camadas reais:
// página -> PhotoRosterList -> StudentCard -> usePhotoRoster -> photoRosterService -> authFetch.
// Só a rede é simulada: o fetch global cai no backend em memória abaixo, que segue o RoomService da US24
// (soft delete do vínculo) e os status dos testes de backend (204, 403, 400).

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "987e6543-e21b-12d3-a456-426614174000" }),
  useSearchParams: () => new URLSearchParams("tab=people"),
  usePathname: () => "/teacher-rooms/987e6543-e21b-12d3-a456-426614174000/disciplines",
}));

// --- fakeBackend ---
interface Membership {
  user: typeof TUTOR;
  active: boolean;
  unlinkedAt: string | null;
}

let memberships: Membership[];
let requesterIsRoomTutor: boolean;
let holdNextDelete: boolean;
let heldResponses: Array<() => void>;
let requests: Array<{ method: string; url: string; authorization: string | null }>;

function activeMembers() {
  return memberships.filter((membership) => membership.active).map((membership) => membership.user);
}

function respond(method: string, url: string): Response {
  if (method === "GET" && /\/api\/v1\/rooms$/.test(url)) return jsonResponse([ROOM], 200);
  if (method === "GET" && new RegExp(`/api/v1/rooms/${ROOM_ID}$`).test(url)) return jsonResponse(ROOM, 200);
  if (method === "GET" && new RegExp(`/api/v1/rooms/${ROOM_ID}/problems$`).test(url)) return jsonResponse([], 200);
  // Mesmo formato do RoomService.listRoomMembers: o tutor primeiro, depois os alunos ativos
  if (method === "GET" && new RegExp(`/api/v1/rooms/${ROOM_ID}/students$`).test(url)) return jsonResponse(activeMembers(), 200);

  const removal = url.match(new RegExp(`/api/v1/rooms/${ROOM_ID}/(?:members|students)/([^/]+)$`));
  if (method === "DELETE" && removal) {
    // @PreAuthorize isOwner: quem não é o tutor recebe 403 com o texto padrão (em inglês)
    if (!requesterIsRoomTutor) return jsonResponse(errorBody(403, BACKEND_FORBIDDEN_TEXT), 403);
    const membership = memberships.find((candidate) => candidate.user.id === removal[1] && candidate.user.role === "STUDENT");
    if (!membership || !membership.active) return jsonResponse(errorBody(400, NOT_IN_ROOM_TEXT), 400);
    // Soft delete: a linha continua, só o vínculo é desativado
    membership.active = false;
    membership.unlinkedAt = "2026-11-13T18:00:00";
    return new Response(null, { status: 204 });
  }
  return jsonResponse(errorBody(404, "Rota inexistente"), 404);
}

function fakeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const url = String(input);
  requests.push({ method, url, authorization: new Headers(init.headers).get("Authorization") });
  if (method === "DELETE" && holdNextDelete) {
    holdNextDelete = false;
    return new Promise((resolve) => heldResponses.push(() => resolve(respond(method, url))));
  }
  return Promise.resolve(respond(method, url));
}

const writes = () => requests.filter((request) => request.method !== "GET");
const membershipOf = (id: string) => memberships.find((membership) => membership.user.id === id)!;

// --- tela ---
// O card do aluno é o botão de remoção com o nome dele: o toast pode citar o nome sem confundir a verificação
const cardOf = (name: string) => screen.queryByRole("button", { name: removeButtonName(name) });

// A página inteira pode ter outros status/alertas: procura o que tem o texto esperado
async function expectAnnounced(role: "status" | "alert", text: RegExp | string) {
  await waitFor(() =>
    expect(
      screen.queryAllByRole(role).some((element) =>
        typeof text === "string" ? element.textContent?.includes(text) : text.test(element.textContent ?? ""),
      ),
    ).toBe(true),
  );
}

function announced(role: "status" | "alert", text: RegExp) {
  return screen.queryAllByRole(role).some((element) => text.test(element.textContent ?? ""));
}
async function renderPeopleTab() {
  const user = userEvent.setup();
  render(<DisciplinesPage />);
  await screen.findByText(ALICE.name, {}, { timeout: 3000 });
  return { user };
}

async function confirmRemoval(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name: removeButtonName(name) }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^remover$/i }));
}

beforeEach(() => {
  push.mockReset();
  memberships = [TUTOR, ALICE, BRUNO].map((user) => ({ user, active: true, unlinkedAt: null }));
  requesterIsRoomTutor = true;
  holdNextDelete = false;
  heldResponses = [];
  requests = [];
  localStorage.clear();
  localStorage.setItem("token", STORED_TOKEN);
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
});

afterEach(() => {
  localStorage.clear();
});

describe("[US24] Integração da remoção de aluno na aba Pessoas", () => {
  it("Deve listar os alunos ativos com o botão de remoção, sem oferecer a remoção do tutor", async () => {
    await renderPeopleTab();

    expect(screen.getByRole("button", { name: removeButtonName(ALICE.name) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: removeButtonName(BRUNO.name) })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: removeButtonName(TUTOR.name) })).not.toBeInTheDocument();
  });

  it("CA1: deve avisar sobre histórico preservado e acesso revogado antes de qualquer DELETE", async () => {
    const { user } = await renderPeopleTab();

    await user.click(screen.getByRole("button", { name: removeButtonName(ALICE.name) }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(ALICE.name);
    expect(dialog).toHaveTextContent(HISTORY_PRESERVED_WARNING);
    expect(dialog).toHaveTextContent(ACCESS_REVOKED_WARNING);
    expect(writes()).toHaveLength(0);
  });

  it("CA3: cancelar não chama a API e o aluno continua na sala", async () => {
    const { user } = await renderPeopleTab();

    await user.click(screen.getByRole("button", { name: removeButtonName(ALICE.name) }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cardOf(ALICE.name)).toBeInTheDocument();
    expect(writes()).toHaveLength(0);
    expect(membershipOf(ALICE.id).active).toBe(true);
  });

  it("CA2: confirmar desativa só o vínculo no backend e tira o aluno da lista sem recarregar a página", async () => {
    const { user } = await renderPeopleTab();

    await confirmRemoval(user, ALICE.name);

    await expectAnnounced("status", REMOVED_MESSAGE);
    await waitFor(() => expect(cardOf(ALICE.name)).not.toBeInTheDocument());
    expect(cardOf(BRUNO.name)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    // Integridade do histórico, do lado do front: a única escrita é o DELETE do vínculo (nada de excluir usuário,
    // notas, presenças ou feedbacks). A preservação no banco é coberta pelos testes de backend da US24.
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toMatchObject({ method: "DELETE", authorization: `Bearer ${STORED_TOKEN}` });
    expect(writes()[0].url).toMatch(removeRoute(ALICE.id));
    // Soft delete no backend: a linha continua, só inativa
    expect(membershipOf(ALICE.id)).toMatchObject({ active: false, unlinkedAt: expect.any(String) });
  });

  it("Deve mostrar o aluno até o backend confirmar e bloquear um segundo DELETE durante o envio", async () => {
    holdNextDelete = true;
    const { user } = await renderPeopleTab();

    await user.click(screen.getByRole("button", { name: removeButtonName(ALICE.name) }));
    const confirm = within(screen.getByRole("dialog")).getByRole("button", { name: /^remover$/i });
    await user.click(confirm);
    // Pode já ter fechado o modal ou desabilitado o botão: um segundo clique não pode sair
    if (screen.queryByRole("dialog")) await user.click(confirm);

    expect(writes()).toHaveLength(1);
    expect(cardOf(ALICE.name)).toBeInTheDocument();

    await act(async () => {
      heldResponses.splice(0).forEach((release) => release());
    });
    await expectAnnounced("status", REMOVED_MESSAGE);
    await waitFor(() => expect(cardOf(ALICE.name)).not.toBeInTheDocument());
  });

  // --- 403: QUEM NÃO É O TUTOR ---

  it("Deve mostrar a recusa 403 em português, manter o aluno e o carômetro, e não alterar o vínculo", async () => {
    requesterIsRoomTutor = false;
    const { user } = await renderPeopleTab();

    await confirmRemoval(user, ALICE.name);

    await expectAnnounced("alert", FORBIDDEN_MESSAGE);
    expect(document.body).not.toHaveTextContent(BACKEND_FORBIDDEN_TEXT);
    expect(cardOf(ALICE.name)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
    expect(announced("status", REMOVED_MESSAGE)).toBe(false);
    expect(membershipOf(ALICE.id).active).toBe(true);
  });

  it("Deve permitir remover depois de uma recusa, quando o backend passa a aceitar", async () => {
    requesterIsRoomTutor = false;
    const { user } = await renderPeopleTab();
    await confirmRemoval(user, ALICE.name);
    await expectAnnounced("alert", FORBIDDEN_MESSAGE);

    requesterIsRoomTutor = true;
    await confirmRemoval(user, ALICE.name);

    await expectAnnounced("status", REMOVED_MESSAGE);
    expect(membershipOf(ALICE.id).active).toBe(false);
  });

  // --- 400: ALUNO JÁ FORA DA SALA ---

  it("Deve mostrar a mensagem do backend quando o aluno já não está na sala (removido em outra aba)", async () => {
    const { user } = await renderPeopleTab();
    // Outra sessão do tutor removeu a Alice depois que a lista foi carregada
    membershipOf(ALICE.id).active = false;

    await confirmRemoval(user, ALICE.name);

    await expectAnnounced("alert", NOT_IN_ROOM_TEXT);
    expect(writes()).toHaveLength(1);
  });
});
