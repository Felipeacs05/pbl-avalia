import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLeaveRoom } from "@/hooks/useLeaveRoom";
import { roomService } from "@/services/roomService";
import {
  deferred,
  LOGIN_PAGE,
  makeAlreadyLeftError,
  makeNetworkError,
  makeNotMemberError,
  makeServerError,
  makeTutorError,
  makeUnauthorizedError,
  ROOM_ID,
  STORED_TOKEN,
  storeSession,
  STUDENT_ROOMS_ROUTE,
  TUTOR_CANNOT_LEAVE_TEXT,
} from "../fixtures";

// Camada de HOOK: estado da saída, sessão e navegação. O service é simulado.
// O mock global do setup cria um router novo a cada chamada: aqui push e replace são únicos para poder conferir.
const { push, replace } = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace, prefetch: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "a25e0001-e21b-12d3-a456-426614174025" }),
  usePathname: () => "/student-rooms/a25e0001-e21b-12d3-a456-426614174025",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/roomService", () => ({
  roomService: {
    fetchRooms: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
  },
}));

const service = vi.mocked(roomService);

// Todos os destinos de navegação, por push ou replace
const navigations = () => [...push.mock.calls, ...replace.mock.calls].map(([href]) => String(href));

async function leave(result: { current: ReturnType<typeof useLeaveRoom> }) {
  let outcome: boolean | undefined;
  await act(async () => {
    outcome = await result.current.leaveRoom();
  });
  return outcome;
}

describe("[US25] useLeaveRoom", () => {
  beforeEach(() => {
    push.mockReset();
    replace.mockReset();
    localStorage.clear();
    storeSession();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("Deve começar sem saída em andamento e sem erro", () => {
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    expect(result.current.isLeaving).toBe(false);
    expect(result.current.error).toBeNull();
    expect(service.leaveRoom).not.toHaveBeenCalled();
  });

  // --- SUCESSO E BLOQUEIO IMEDIATO ---

  it("Deve sair pelo service com o id da sala e resolver true", async () => {
    service.leaveRoom.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    const outcome = await leave(result);

    expect(service.leaveRoom).toHaveBeenCalledTimes(1);
    expect(service.leaveRoom).toHaveBeenCalledWith(ROOM_ID);
    expect(outcome).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isLeaving).toBe(false);
  });

  it("Deve sair na hora das rotas da sala com replace, para o 'Voltar' não devolver o aluno à sala", async () => {
    service.leaveRoom.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    await leave(result);

    // Sem atraso: a navegação acontece assim que o backend confirma
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE);
    expect(push).not.toHaveBeenCalled();
  });

  it("Não deve navegar antes de o backend confirmar a saída", async () => {
    const pending = deferred<void>();
    service.leaveRoom.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    let call!: Promise<boolean>;
    act(() => {
      call = result.current.leaveRoom();
    });

    expect(result.current.isLeaving).toBe(true);
    expect(navigations()).toEqual([]);

    await act(async () => {
      pending.resolve();
      await call;
    });

    expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE);
  });

  it("Deve manter a sessão do aluno: sair da sala não é sair da conta", async () => {
    service.leaveRoom.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    await leave(result);

    expect(localStorage.getItem("token")).toBe(STORED_TOKEN);
    expect(navigations()).not.toContain(LOGIN_PAGE);
  });

  it("Deve ignorar um segundo pedido enquanto o primeiro está em andamento", async () => {
    const pending = deferred<void>();
    service.leaveRoom.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    let first!: Promise<boolean>;
    act(() => {
      first = result.current.leaveRoom();
    });
    await act(async () => {
      await result.current.leaveRoom();
    });

    expect(service.leaveRoom).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await first;
    });
    expect(replace).toHaveBeenCalledTimes(1);
  });

  // --- 400: TUTOR TENTANDO SAIR ---

  it("Deve resolver false no 400, expor a mensagem do backend e continuar na sala", async () => {
    service.leaveRoom.mockRejectedValue(makeTutorError());
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    // Se a rejeição escapar do hook, este await falha o teste
    const outcome = await leave(result);

    expect(outcome).toBe(false);
    expect(result.current.error).toBe(TUTOR_CANNOT_LEAVE_TEXT);
    expect(result.current.isLeaving).toBe(false);
    expect(navigations()).toEqual([]);
  });

  // --- 404/409: JÁ SEM VÍNCULO ---

  // Decisão a combinar (ver fixtures): sem vínculo, o resultado é o mesmo da saída, e o aluno não pode ficar na sala
  it.each([
    ["409 (já saiu)", makeAlreadyLeftError],
    ["404 (não vinculado)", makeNotMemberError],
  ])("Deve tratar o %s como saída concluída e tirar o aluno da sala", async (_label, makeError) => {
    service.leaveRoom.mockRejectedValue(makeError());
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    const outcome = await leave(result);

    expect(outcome).toBe(true);
    expect(replace).toHaveBeenCalledWith(STUDENT_ROOMS_ROUTE);
    expect(result.current.isLeaving).toBe(false);
  });

  // --- 500 E REDE: A SAÍDA NÃO ACONTECEU ---

  it.each([
    ["500 (falha ao notificar o tutor, com rollback)", makeServerError],
    ["erro de rede", makeNetworkError],
  ])("Deve resolver false no %s, expor a mensagem e continuar na sala", async (_label, makeError) => {
    service.leaveRoom.mockRejectedValue(makeError());
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    const outcome = await leave(result);

    expect(outcome).toBe(false);
    expect(result.current.error).toBe(makeError().message);
    expect(result.current.isLeaving).toBe(false);
    expect(navigations()).toEqual([]);
  });

  it("Deve usar uma mensagem padrão não vazia quando o erro não traz mensagem", async () => {
    service.leaveRoom.mockRejectedValue(new Error());
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    const outcome = await leave(result);

    expect(outcome).toBe(false);
    expect(String(result.current.error ?? "").trim()).not.toBe("");
  });

  it("Deve limpar o erro anterior quando a nova tentativa dá certo", async () => {
    service.leaveRoom.mockRejectedValueOnce(makeServerError()).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    await leave(result);
    expect(result.current.error).not.toBeNull();

    const outcome = await leave(result);

    expect(outcome).toBe(true);
    expect(result.current.error).toBeNull();
    expect(service.leaveRoom).toHaveBeenCalledTimes(2);
  });

  // --- 401: SESSÃO ENCERRADA ---

  it("Deve encerrar a sessão e levar ao login no 401, pois o authFetch não trata 401 sozinho", async () => {
    service.leaveRoom.mockRejectedValue(makeUnauthorizedError());
    const { result } = renderHook(() => useLeaveRoom(ROOM_ID));

    const outcome = await leave(result);

    expect(outcome).toBe(false);
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(navigations()).toEqual([LOGIN_PAGE]);
  });
});
