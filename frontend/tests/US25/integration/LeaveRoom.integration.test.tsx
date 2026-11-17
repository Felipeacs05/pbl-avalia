import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudentRoomDetailsPage from "@/app/student-rooms/[id]/page";
import StudentRoomsPage from "@/app/student-rooms/page";
import {
  ACCESS_LOST_WARNING,
  ALREADY_LEFT_TEXT,
  CANCEL_BUTTON,
  CONFIRM_BUTTON,
  DATA_KEPT_WARNING,
  errorBody,
  jsonResponse,
  LEAVE_ROUTE,
  MY_ROOMS_ROUTE,
  NOT_A_MEMBER_TEXT,
  OTHER_ROOM,
  ROOM,
  ROOM_ID,
  STORED_TOKEN,
  storeSession,
  STUDENT,
  STUDENT_ROOMS_ROUTE,
  TUTOR_CANNOT_LEAVE_TEXT,
  TUTOR_NOTIFIED_WARNING,
} from "../fixtures";

// INTEGRAÇÃO da saída voluntária, com todas as camadas reais:
//   student-rooms/[id]/page -> LeaveRoomModal -> useLeaveRoom -> roomService.leaveRoom -> authFetch
//   student-rooms/[id]/page e student-rooms/page -> useRooms -> roomService.fetchRooms -> authFetch
// Só a rede é simulada: o fetch global cai no backend em memória abaixo, que segue o RoomService.leaveRoom da US25
// (soft delete do vínculo; rollback, com o vínculo ativo, se a notificação ao tutor falhar) e os status dos testes de backend.

// O mock global do setup cria um router novo a cada chamada: aqui push e replace são únicos para poder conferir
const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, prefetch: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "a25e0001-e21b-12d3-a456-426614174025" }),
  usePathname: () => "/student-rooms/a25e0001-e21b-12d3-a456-426614174025",
  useSearchParams: () => new URLSearchParams(),
}));

// --- fakeBackend ---
type Room = typeof ROOM;
interface Membership {
  room: Room;
  active: boolean;
}

let memberships: Membership[];
let requesterIsTutor: boolean;
let failNotification: boolean;
let holdNextLeave: boolean;
let heldResponses: Array<() => void>;
let requests: Array<{ method: string; url: string; body: string; authorization: string | null }>;

const membershipOf = (roomId: string) => memberships.find((membership) => membership.room.id === roomId)!;
const writes = () => requests.filter((request) => request.method !== "GET");
const leaveRequests = () => requests.filter((request) => request.method === "POST" && LEAVE_ROUTE.test(request.url));

function respond(method: string, url: string, authorization: string | null): Response {
  if (authorization !== `Bearer ${STORED_TOKEN}`) return new Response(null, { status: 401 });

  // Salas do aluno: só os vínculos ativos (o filtro active=true do RoomLeaveRepositoryTest)
  if (method === "GET" && MY_ROOMS_ROUTE.test(url)) {
    return jsonResponse(
      memberships.filter((membership) => membership.active).map((membership) => membership.room),
      200,
    );
  }

  const roomMatch = url.match(/\/api\/v1\/rooms\/([^/]+)(\/.*)?$/);
  const membership = roomMatch ? memberships.find((candidate) => candidate.room.id === roomMatch[1]) : undefined;
  const isActiveMember = Boolean(membership?.active);

  // GET /rooms/{id} não exige vínculo no backend atual; as rotas internas exigem
  if (method === "GET" && roomMatch && !roomMatch[2] && membership) return jsonResponse(membership.room, 200);
  if (method === "GET" && roomMatch && roomMatch[2]) {
    if (!isActiveMember) return jsonResponse(errorBody(403, "Access Denied"), 403);
    return jsonResponse([], 200);
  }

  if (method === "POST" && LEAVE_ROUTE.test(url)) {
    if (requesterIsTutor) return jsonResponse(errorBody(400, TUTOR_CANNOT_LEAVE_TEXT), 400);
    if (!membership) return jsonResponse(errorBody(404, NOT_A_MEMBER_TEXT), 404);
    if (!membership.active) return jsonResponse(errorBody(409, ALREADY_LEFT_TEXT), 409);
    // Transação: se a notificação falhar, o vínculo continua ativo (rollback)
    if (failNotification) return new Response(null, { status: 500 });
    membership.active = false;
    return new Response(null, { status: 204 });
  }

  return jsonResponse(errorBody(404, "Rota inexistente"), 404);
}

function fakeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const url = String(input);
  const authorization = new Headers(init.headers).get("Authorization");
  requests.push({ method, url, body: init.body == null ? "" : String(init.body), authorization });
  if (method === "POST" && LEAVE_ROUTE.test(url) && holdNextLeave) {
    holdNextLeave = false;
    return new Promise((resolve) => heldResponses.push(() => resolve(respond(method, url, authorization))));
  }
  return Promise.resolve(respond(method, url, authorization));
}

// --- tela ---
// O LeaveRoomModal pode ser role="dialog" ou "alertdialog" (o ConfirmModal do projeto usa alertdialog)
const queryDialog = () => screen.queryByRole("dialog") ?? screen.queryByRole("alertdialog");
const getDialog = () => screen.queryByRole("dialog") ?? screen.getByRole("alertdialog");

// Botões "Sair da Sala" da página (mobile e desktop). Só valem com o modal fechado: o confirmar do modal
// também se chama "Sair da sala", por isso ele é sempre buscado dentro do diálogo.
const pageLeaveButtons = () => screen.queryAllByRole("button", { name: /sair da sala/i });

const navigations = () => [...push.mock.calls, ...replace.mock.calls].map(([href]) => String(href));
const navigatedInsideRoom = () => navigations().some((href) => href.includes(`/student-rooms/${ROOM_ID}`));

async function expectAnnounced(role: "status" | "alert", text: RegExp | string) {
  await waitFor(() =>
    expect(
      screen.queryAllByRole(role).some((element) =>
        typeof text === "string" ? element.textContent?.includes(text) : text.test(element.textContent ?? ""),
      ),
    ).toBe(true),
  );
}

// Abre a sala como membro ativo e espera a lista de salas do aluno chegar
async function renderRoomPage() {
  const user = userEvent.setup();
  const view = render(<StudentRoomDetailsPage />);
  await waitFor(() => expect(requests.some((request) => MY_ROOMS_ROUTE.test(request.url))).toBe(true));
  await screen.findAllByText(ROOM.name);
  return { user, view };
}

async function openLeaveModal(user: ReturnType<typeof userEvent.setup>, buttonIndex = 0) {
  await user.click(pageLeaveButtons()[buttonIndex]);
  return getDialog();
}

async function confirmLeave(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await openLeaveModal(user);
  await user.click(within(dialog).getByRole("button", { name: CONFIRM_BUTTON }));
}

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  memberships = [ROOM, OTHER_ROOM].map((room) => ({ room, active: true }));
  requesterIsTutor = false;
  failNotification = false;
  holdNextLeave = false;
  heldResponses = [];
  requests = [];
  localStorage.clear();
  storeSession();
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
});

afterEach(() => {
  localStorage.clear();
});

describe("[US25] Integração da saída voluntária do aluno", () => {
  // --- ANTES DA SAÍDA ---

  it("Controle: o aluno com vínculo ativo vê a sala e os botões de saída, sem ser redirecionado", async () => {
    await renderRoomPage();

    expect(pageLeaveButtons().length).toBeGreaterThan(0);
    expect(navigations()).toEqual([]);
  });

  it("Todo botão 'Sair da Sala' da página deve abrir o aviso (dados mantidos, acesso perdido, tutor notificado) sem chamar a API nem navegar", async () => {
    const { user } = await renderRoomPage();
    const buttons = pageLeaveButtons();
    expect(buttons.length).toBeGreaterThan(0);

    // Hoje há um botão no layout mobile e outro no desktop (os dois no DOM do jsdom); a regra vale para todos
    for (const button of buttons) {
      await user.click(button);
      const dialog = getDialog();
      expect(dialog).toHaveTextContent(ROOM.name);
      expect(dialog).toHaveTextContent(DATA_KEPT_WARNING);
      expect(dialog).toHaveTextContent(ACCESS_LOST_WARNING);
      expect(dialog).toHaveTextContent(TUTOR_NOTIFIED_WARNING);
      await user.click(within(dialog).getByRole("button", { name: CANCEL_BUTTON }));
    }

    expect(writes()).toHaveLength(0);
    expect(navigations()).toEqual([]);
  });

  it("Cancelar deve fechar o aviso, manter o aluno na sala e não chamar a API", async () => {
    const { user } = await renderRoomPage();

    const dialog = await openLeaveModal(user);
    await user.click(within(dialog).getByRole("button", { name: CANCEL_BUTTON }));

    expect(queryDialog()).not.toBeInTheDocument();
    expect(writes()).toHaveLength(0);
    expect(navigations()).toEqual([]);
    expect(membershipOf(ROOM_ID).active).toBe(true);
  });

  // --- SAÍDA CONFIRMADA ---

  it("Confirmar deve desativar só o vínculo e tirar o aluno da sala com replace", async () => {
    const { user } = await renderRoomPage();

    await confirmLeave(user);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE));
    expect(push).not.toHaveBeenCalled();
    // Mantendo os dados: a única escrita é o POST /leave, autenticado e sem o id do aluno
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toMatchObject({ method: "POST", authorization: `Bearer ${STORED_TOKEN}` });
    expect(writes()[0].url).toMatch(LEAVE_ROUTE);
    expect(writes()[0].body).not.toContain(STUDENT.id);
    // O pedido chegou ao backend e só esta sala foi afetada (a notificação é do backend: coberta nos testes dele)
    expect(membershipOf(ROOM_ID).active).toBe(false);
    expect(membershipOf(OTHER_ROOM.id).active).toBe(true);
    // Sair da sala não é sair da conta
    expect(localStorage.getItem("token")).toBe(STORED_TOKEN);
  });

  it("Deve manter o aluno na sala até o backend confirmar e enviar um único POST mesmo com clique duplo", async () => {
    holdNextLeave = true;
    const { user } = await renderRoomPage();

    const dialog = await openLeaveModal(user);
    const confirm = within(dialog).getByRole("button", { name: CONFIRM_BUTTON });
    await user.click(confirm);
    // O modal pode já ter desabilitado o botão: um segundo clique não pode gerar outra saída
    if (queryDialog()) await user.click(confirm);

    expect(leaveRequests()).toHaveLength(1);
    expect(navigations()).toEqual([]);

    await act(async () => {
      heldResponses.splice(0).forEach((release) => release());
    });

    await waitFor(() => expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE));
    expect(leaveRequests()).toHaveLength(1);
  });

  // --- RECUSAS DO BACKEND ---

  it("Deve mostrar a recusa 400 (tutor da sala) e manter o usuário na sala, com o vínculo ativo", async () => {
    requesterIsTutor = true;
    const { user } = await renderRoomPage();

    await confirmLeave(user);

    await expectAnnounced("alert", TUTOR_CANNOT_LEAVE_TEXT);
    expect(navigations()).toEqual([]);
    expect(membershipOf(ROOM_ID).active).toBe(true);
  });

  it("Falha ao notificar o tutor (500, rollback): deve avisar, manter o aluno na sala e permitir tentar de novo", async () => {
    failNotification = true;
    const { user } = await renderRoomPage();

    await confirmLeave(user);

    await waitFor(() => expect(screen.queryAllByRole("alert").length).toBeGreaterThan(0));
    expect(navigations()).toEqual([]);
    expect(membershipOf(ROOM_ID).active).toBe(true);

    // O backend volta a aceitar: a nova tentativa sai da sala
    failNotification = false;
    const dialog = queryDialog() ?? (await openLeaveModal(user));
    await user.click(within(dialog).getByRole("button", { name: CONFIRM_BUTTON }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE));
    expect(membershipOf(ROOM_ID).active).toBe(false);
    expect(leaveRequests()).toHaveLength(2);
  });

  it("Deve tirar o aluno da sala quando ele já tinha saído em outra aba (409)", async () => {
    const { user } = await renderRoomPage();
    // Outra aba do aluno saiu da sala depois que esta página carregou
    membershipOf(ROOM_ID).active = false;

    await confirmLeave(user);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE));
    expect(leaveRequests()).toHaveLength(1);
  });

  // --- BLOQUEIO IMEDIATO PÓS-SAÍDA ---

  it("Depois da saída, a lista de salas do aluno não mostra mais a sala, e mantém as outras", async () => {
    const { user, view } = await renderRoomPage();
    await confirmLeave(user);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE));
    view.unmount();

    // Navegação para /student-rooms
    render(<StudentRoomsPage />);

    await screen.findByText(OTHER_ROOM.name);
    expect(screen.queryByText(ROOM.name)).not.toBeInTheDocument();
  });

  it("Depois da saída, reabrir a URL da sala deve redirecionar com replace e não oferecer ações da sala", async () => {
    const { user, view } = await renderRoomPage();
    await confirmLeave(user);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE));
    view.unmount();
    replace.mockReset();
    push.mockReset();
    const requestsBefore = requests.length;

    // O aluno digita a URL da sala (ou usa o histórico do navegador)
    render(<StudentRoomDetailsPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE));
    await waitFor(() => expect(pageLeaveButtons()).toHaveLength(0));
    expect(screen.queryByText(ROOM.name)).not.toBeInTheDocument();
    expect(navigatedInsideRoom()).toBe(false);
    // Nenhuma nova escrita: o bloqueio é só de acesso
    expect(requests.slice(requestsBefore).filter((request) => request.method !== "GET")).toEqual([]);
  });

});
