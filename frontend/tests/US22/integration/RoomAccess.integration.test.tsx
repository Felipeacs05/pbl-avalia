import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosAdapter, type AxiosResponse } from "axios";
import TeacherRoomsPage from "@/app/teacher-rooms/page";
import JoinByLinkPage from "@/app/app/join/[code]/page";
import VerifyEmailPage from "@/app/verify-email/page";
import { api } from "@/services/api";
import type { Room } from "@/types/room";
import {
  AFTER_VERIFY_ROUTE,
  EMAIL_NOT_VERIFIED_CODE,
  INVALID_CODE_TEXT,
  MAX_REDIRECT_DELAY_MS,
  mockWindowLocation,
  NOT_VERIFIED_TEXT,
  PENDING_EMAIL,
  PENDING_USER,
  PENDING_USER_TOKEN,
  VALID_CODE,
  VERIFY_EMAIL_PAGE,
  VERIFY_SUCCESS_TEXT,
} from "../fixtures";

// INTEGRAÇÃO do objetivo da US22 pelas telas reais: o usuário pendente não cria nem ingressa em salas
// e é levado à verificação; depois de confirmar o e-mail, os mesmos pedidos passam.
//  - Criar:    teacher-rooms/page -> CreateRoomModal -> useRooms -> roomService -> authFetch (interceptor)
//  - Ingressar: app/join/[code]/page -> roomService.joinRoom -> authFetch (interceptor)
//    (a student-rooms/page usa o mock attemptEnterRoom em teste, por isso o ingresso é pelo link de convite)
//  - Verificar: verify-email/page -> ... -> emailVerificationService -> api.ts (interceptor)
// Só a rede é simulada: o fetch global e o adapter do axios caem no mesmo backend em memória.

// O mock global do setup cria um push novo a cada chamada: aqui ele é um só, e os params são controláveis
const { push, nav } = vi.hoisted(() => ({ push: vi.fn(), nav: { params: {} as Record<string, string> } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useParams: () => nav.params,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const ROOMS_ROUTE = /\/api\/v1\/rooms$/;
const JOIN_ROUTE = /\/api\/v1\/rooms\/join$/;
const VERIFY_ROUTE = /\/api\/v1\/auth\/verify-email$/;

const ROOMS_HREF = "http://localhost:3000/teacher-rooms";
const VERIFY_HREF = "http://localhost:3000/verify-email";
const NEW_ROOM_NAME = "Compiladores";
const INVITE_CODE = "ABC123";
const CREATED_TOAST = "Sala criada com sucesso!";
const JOINED_TEXT = /você entrou na sala/i;

// Estado do fakeBackend: a conta, as salas do tutor, a sala do convite e quem já ingressou nela
let verified: boolean;
let ownRooms: Room[];
let inviteMembers: string[];
let requests: Array<{ method: string; url: string; body: Record<string, unknown>; authorization: string | null }>;

function errorBody(status: number, error: string, message: string, code?: string) {
  return { timestamp: new Date().toISOString(), status, error, message, ...(code ? { code } : {}) };
}

// Regras do backend: filtro da US22 em POST /rooms e POST /rooms/join; verificação do código
function respond(method: string, url: string, body: Record<string, unknown>, authorization: string | null) {
  requests.push({ method, url, body, authorization });
  const loggedIn = authorization === `Bearer ${PENDING_USER_TOKEN}`;

  if (method === "POST" && VERIFY_ROUTE.test(url)) {
    if (body.email !== PENDING_EMAIL || body.code !== VALID_CODE || verified) {
      return { status: 400, data: errorBody(400, "Bad Request", INVALID_CODE_TEXT) };
    }
    verified = true;
    return { status: 200, data: { message: VERIFY_SUCCESS_TEXT } };
  }

  if (!loggedIn) return { status: 401, data: errorBody(401, "Unauthorized", "Token inválido ou expirado") };

  // Listar continua liberado para o pendente: a restrição é só criar e ingressar
  if (method === "GET" && ROOMS_ROUTE.test(url)) return { status: 200, data: ownRooms };

  if (method === "POST" && (ROOMS_ROUTE.test(url) || JOIN_ROUTE.test(url))) {
    if (!verified) {
      return { status: 403, data: errorBody(403, "Forbidden", NOT_VERIFIED_TEXT, EMAIL_NOT_VERIFIED_CODE) };
    }
    if (ROOMS_ROUTE.test(url)) {
      const room: Room = { id: "room-new", name: String(body.name), code: "SALA9", joinLink: "app/join/SALA9", semester: "2026.2" };
      ownRooms = [...ownRooms, room];
      return { status: 201, data: room };
    }
    if (body.accessCode !== INVITE_CODE) return { status: 404, data: errorBody(404, "Not Found", "Sala não encontrada.") };
    inviteMembers = [...inviteMembers, PENDING_EMAIL];
    return { status: 200, data: { id: "room-invite", name: "Circuitos Digitais", code: INVITE_CODE, joinLink: `app/join/${INVITE_CODE}`, semester: "2026.2" } };
  }

  return { status: 404, data: errorBody(404, "Not Found", "Rota inexistente") };
}

// Fronteira de rede do fetch (authFetch)
async function fakeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { status, data } = respond(
    (init.method ?? "GET").toUpperCase(),
    String(input),
    init.body ? JSON.parse(String(init.body)) : {},
    new Headers(init.headers).get("Authorization"),
  );
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

// Fronteira de rede do axios (api.ts)
const fakeAxios: AxiosAdapter = async (config) => {
  const authorization = config.headers?.Authorization;
  const { status, data } = respond(
    String(config.method ?? "get").toUpperCase(),
    `${config.baseURL ?? ""}${config.url ?? ""}`,
    typeof config.data === "string" && config.data ? JSON.parse(config.data) : {},
    authorization ? String(authorization) : null,
  );
  const response = { status, statusText: "", data, headers: {}, config } as AxiosResponse;
  if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response);
  return response;
};

function requestsTo(method: string, route: RegExp) {
  return requests.filter((request) => request.method === method && route.test(request.url));
}

function newUser() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

async function renderTeacherRooms() {
  const user = newUser();
  const view = render(<TeacherRoomsPage />);
  await waitFor(() => expect(screen.queryByText(/carregando salas/i)).not.toBeInTheDocument());
  return { user, view };
}

async function createThroughModal(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("button", { name: /criar nova sala/i }));
  const dialog = within(await screen.findByRole("dialog"));
  await user.type(dialog.getByLabelText(/título/i), name);
  await user.click(dialog.getByRole("button", { name: /^criar$/i }));
}

function moveTo(href: string) {
  restoreLocation();
  restoreLocation = mockWindowLocation(href);
}

const originalAdapter = api.defaults.adapter;
let restoreLocation: () => void;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  push.mockReset();
  nav.params = {};
  verified = false;
  ownRooms = [];
  inviteMembers = [];
  requests = [];
  localStorage.clear();
  localStorage.setItem("token", PENDING_USER_TOKEN);
  localStorage.setItem("user", JSON.stringify(PENDING_USER));
  restoreLocation = mockWindowLocation(ROOMS_HREF);
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  api.defaults.adapter = fakeAxios;
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  restoreLocation();
  localStorage.clear();
  vi.useRealTimers();
});

describe("[US22] Integração — acesso às salas conforme a verificação do e-mail", () => {
  // --- CRIAR SALA ---

  it("Deve impedir o usuário pendente de criar sala e levá-lo à verificação, sem encerrar a sessão", async () => {
    const { user } = await renderTeacherRooms();

    await createThroughModal(user, NEW_ROOM_NAME);

    await waitFor(() => expect(window.location.href).toMatch(VERIFY_EMAIL_PAGE));
    // O pedido saiu autenticado e foi o backend quem recusou: nada foi gravado
    const posts = requestsTo("POST", ROOMS_ROUTE);
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({ name: NEW_ROOM_NAME });
    expect(posts[0].authorization).toBe(`Bearer ${PENDING_USER_TOKEN}`);
    expect(ownRooms).toHaveLength(0);
    // A tela não pode anunciar sucesso
    expect(screen.queryByText(CREATED_TOAST)).not.toBeInTheDocument();
    expect(screen.queryByText(NEW_ROOM_NAME)).not.toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe(PENDING_USER_TOKEN);
  });

  it("Deve permitir ao usuário verificado criar sala, sem desviar para a verificação", async () => {
    verified = true;
    const { user } = await renderTeacherRooms();

    await createThroughModal(user, NEW_ROOM_NAME);

    expect(await screen.findByText(CREATED_TOAST)).toBeInTheDocument();
    expect(ownRooms.map((room) => room.name)).toEqual([NEW_ROOM_NAME]);
    expect(window.location.href).toBe(ROOMS_HREF);
  });

  // --- INGRESSAR EM SALA ---

  it("Deve impedir o usuário pendente de ingressar pelo link de convite e levá-lo à verificação", async () => {
    nav.params = { code: INVITE_CODE.toLowerCase() };
    moveTo(`http://localhost:3000/app/join/${INVITE_CODE.toLowerCase()}`);

    render(<JoinByLinkPage />);

    await waitFor(() => expect(window.location.href).toMatch(VERIFY_EMAIL_PAGE));
    expect(requestsTo("POST", JOIN_ROUTE).map((request) => request.body)).toEqual([{ accessCode: INVITE_CODE }]);
    expect(inviteMembers).toHaveLength(0);
    expect(screen.queryByText(JOINED_TEXT)).not.toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe(PENDING_USER_TOKEN);
  });

  it("Deve permitir ao usuário verificado ingressar pelo link de convite, sem desviar para a verificação", async () => {
    verified = true;
    nav.params = { code: INVITE_CODE.toLowerCase() };
    const href = `http://localhost:3000/app/join/${INVITE_CODE.toLowerCase()}`;
    moveTo(href);

    render(<JoinByLinkPage />);

    expect(await screen.findByText(JOINED_TEXT)).toBeInTheDocument();
    expect(inviteMembers).toEqual([PENDING_EMAIL]);
    expect(window.location.href).toBe(href);
  });

  // --- JORNADA COMPLETA ---

  it("Deve completar a jornada: bloqueado ao criar sala, confirma o e-mail e então cria a sala na mesma sessão", async () => {
    // 1. Pendente tenta criar a sala: recusa e desvio para a verificação
    const first = await renderTeacherRooms();
    await createThroughModal(first.user, NEW_ROOM_NAME);
    await waitFor(() => expect(window.location.href).toMatch(VERIFY_EMAIL_PAGE));
    first.view.unmount();

    // 2. Na página de verificação, confirma com o código enviado no cadastro
    moveTo(VERIFY_HREF);
    const user = newUser();
    const verifyView = render(<VerifyEmailPage />);
    await user.type(screen.getByLabelText(/código/i), VALID_CODE);
    await user.click(screen.getByRole("button", { name: /^(verificar|confirmar)/i }));
    expect(await screen.findByText(VERIFY_SUCCESS_TEXT)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_REDIRECT_DELAY_MS);
    });
    expect(push).toHaveBeenCalledWith(AFTER_VERIFY_ROUTE);
    expect(verified).toBe(true);
    verifyView.unmount();

    // 3. De volta às salas, com o mesmo token, o mesmo pedido agora passa
    moveTo(ROOMS_HREF);
    const second = await renderTeacherRooms();
    await createThroughModal(second.user, NEW_ROOM_NAME);

    expect(await screen.findByText(CREATED_TOAST)).toBeInTheDocument();
    expect(requestsTo("POST", ROOMS_ROUTE)).toHaveLength(2);
    expect(ownRooms.map((room) => room.name)).toEqual([NEW_ROOM_NAME]);
    expect(localStorage.getItem("token")).toBe(PENDING_USER_TOKEN);
    expect(window.location.href).toBe(ROOMS_HREF);
  });
});
