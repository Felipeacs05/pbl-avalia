import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePhotoRoster } from "@/hooks/usePhotoRoster";
import { photoRosterService } from "@/services/photoRosterService";
import { ALICE, BRUNO, FORBIDDEN_MESSAGE, makeForbiddenError, makeNotInRoomError, NOT_IN_ROOM_TEXT, ROOM_ID, TUTOR } from "../fixtures";

// Camada de HOOK: estado da lista e da remoção. O service é simulado.
vi.mock("@/services/photoRosterService", () => ({
  photoRosterService: { getStudentsByRoom: vi.fn(), removeStudentFromRoom: vi.fn() },
}));

const service = vi.mocked(photoRosterService);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function renderLoaded() {
  service.getStudentsByRoom.mockResolvedValue([TUTOR, ALICE, BRUNO]);
  const view = renderHook(() => usePhotoRoster(ROOM_ID));
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

const names = (students: Array<{ name: string }>) => students.map((student) => student.name);

describe("[US24] usePhotoRoster — remoção de aluno", () => {
  it("Deve começar sem remoção em andamento e sem erro de remoção", async () => {
    const { result } = await renderLoaded();

    expect(result.current.isRemoving).toBe(false);
    expect(result.current.removeError).toBeNull();
  });

  it("Deve remover pelo service da sala e trocar a lista pela devolvida pelo backend", async () => {
    service.removeStudentFromRoom.mockResolvedValue([TUTOR, BRUNO]);
    const { result } = await renderLoaded();

    let removed: boolean | undefined;
    await act(async () => {
      removed = await result.current.removeStudent(ALICE.id);
    });

    expect(service.removeStudentFromRoom).toHaveBeenCalledTimes(1);
    expect(service.removeStudentFromRoom).toHaveBeenCalledWith(ROOM_ID, ALICE.id);
    expect(removed).toBe(true);
    expect(names(result.current.students)).toEqual([TUTOR.name, BRUNO.name]);
    expect(result.current.removeError).toBeNull();
  });

  it("Deve manter o aluno na lista até o backend confirmar a remoção", async () => {
    const pending = deferred<typeof ALICE[]>();
    service.removeStudentFromRoom.mockReturnValue(pending.promise);
    const { result } = await renderLoaded();

    let call!: Promise<boolean>;
    act(() => {
      call = result.current.removeStudent(ALICE.id);
    });

    expect(result.current.isRemoving).toBe(true);
    expect(names(result.current.students)).toContain(ALICE.name);

    await act(async () => {
      pending.resolve([TUTOR, BRUNO]);
      await call;
    });
    expect(result.current.isRemoving).toBe(false);
    expect(names(result.current.students)).not.toContain(ALICE.name);
  });

  // --- 403: QUEM NÃO É O TUTOR ---

  it("Deve devolver false no 403, expor a mensagem e manter a lista intacta", async () => {
    service.removeStudentFromRoom.mockRejectedValue(makeForbiddenError());
    const { result } = await renderLoaded();

    let removed: boolean | undefined;
    await act(async () => {
      removed = await result.current.removeStudent(ALICE.id);
    });

    expect(removed).toBe(false);
    expect(result.current.removeError).toMatch(FORBIDDEN_MESSAGE);
    expect(names(result.current.students)).toEqual([TUTOR.name, ALICE.name, BRUNO.name]);
    expect(result.current.isRemoving).toBe(false);
  });

  it("Não deve tratar a falha da remoção como erro de carregamento (que esconderia a lista na tela)", async () => {
    service.removeStudentFromRoom.mockRejectedValue(makeForbiddenError());
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.removeStudent(ALICE.id);
    });

    expect(result.current.error).toBeNull();
  });

  it("Deve expor a mensagem do backend quando o aluno já não está na sala (400)", async () => {
    service.removeStudentFromRoom.mockRejectedValue(makeNotInRoomError());
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.removeStudent(ALICE.id);
    });

    expect(result.current.removeError).toBe(NOT_IN_ROOM_TEXT);
  });

  it("Deve limpar o erro de remoção anterior quando a próxima remoção dá certo", async () => {
    service.removeStudentFromRoom.mockRejectedValueOnce(makeForbiddenError()).mockResolvedValueOnce([TUTOR, BRUNO]);
    const { result } = await renderLoaded();

    await act(async () => {
      await result.current.removeStudent(ALICE.id);
    });
    expect(result.current.removeError).not.toBeNull();

    await act(async () => {
      await result.current.removeStudent(ALICE.id);
    });

    expect(result.current.removeError).toBeNull();
    expect(names(result.current.students)).toEqual([TUTOR.name, BRUNO.name]);
  });
});
