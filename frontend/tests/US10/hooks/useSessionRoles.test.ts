import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSessionRoles } from "@/hooks/useSessionRoles";
import { sessionRoleService } from "@/services/sessionRoleService";
import type { SessionRoleAssignment } from "@/types/sessionRole";
import {
  makeAssignment,
  makeOtherStudent,
  makeRoleTakenError,
  makeRow,
  makeStudent,
  OTHER_STUDENT_ID,
  ROLE_TAKEN_MESSAGE,
  SESSION_ID,
} from "../fixtures";

vi.mock("@/services/sessionRoleService", () => ({
  sessionRoleService: { assignRole: vi.fn() },
}));

const service = vi.mocked(sessionRoleService);

// Promessa controlada pelo teste: permite olhar a tela enquanto o salvamento ainda está em andamento
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// A lista vem de outra US; o array fica fora do render para manter a mesma referência
const boardSecretary = makeStudent({ role: "BOARD_SECRETARY", extraGrade: 0.5 });
const initialStudents = [boardSecretary, makeOtherStudent()];

function renderSessionRolesHook() {
  return renderHook(() => useSessionRoles(SESSION_ID, initialStudents));
}

describe("[US10] useSessionRoles", () => {
  it("Deve expor os alunos recebidos com seus papéis, sem salvamento em andamento e sem chamar o service", () => {
    const { result } = renderSessionRolesHook();

    expect(result.current.students).toEqual([makeRow(boardSecretary), makeRow(makeOtherStudent())]);
    expect(result.current.error).toBeNull();
    expect(service.assignRole).not.toHaveBeenCalled();
  });

  it("Deve destacar o papel na hora e salvar em segundo plano, guardando a atribuição devolvida pelo servidor", async () => {
    const pending = deferred<SessionRoleAssignment>();
    service.assignRole.mockReturnValue(pending.promise);
    const { result } = renderSessionRolesHook();

    // Sem await: o destaque não pode esperar a rede para aparecer
    act(() => {
      void result.current.assignRole(OTHER_STUDENT_ID, "TABLE_SECRETARY", 0.5);
    });

    expect(service.assignRole).toHaveBeenCalledTimes(1);
    expect(service.assignRole).toHaveBeenCalledWith(SESSION_ID, "TABLE_SECRETARY", OTHER_STUDENT_ID, 0.5);
    expect(result.current.students[1]).toMatchObject({ role: "TABLE_SECRETARY", extraGrade: 0.5, isSaving: true });

    // Nota diferente da enviada: prova que a linha final vem da resposta do servidor, não do clique
    await act(async () => {
      pending.resolve(makeAssignment({
        studentId: OTHER_STUDENT_ID, studentName: "Bruno Lima", role: "TABLE_SECRETARY", extraGrade: 0.75,
      }));
    });

    expect(result.current.students[1]).toEqual(
      makeRow(makeOtherStudent({ role: "TABLE_SECRETARY", extraGrade: 0.75 }), false),
    );
    // A atribuição de um aluno não toca na linha do outro
    expect(result.current.students[0]).toEqual(makeRow(boardSecretary, false));
    expect(result.current.error).toBeNull();
  });

  it("[QA] Deve desfazer o destaque e expor a mensagem do backend quando o papel de Secretário já está com outro aluno", async () => {
    const pending = deferred<SessionRoleAssignment>();
    service.assignRole.mockReturnValue(pending.promise);
    const { result } = renderSessionRolesHook();

    act(() => {
      void result.current.assignRole(OTHER_STUDENT_ID, "BOARD_SECRETARY", 0.5);
    });
    // Destaque imediato também no caso que o backend vai recusar
    expect(result.current.students[1]).toMatchObject({ role: "BOARD_SECRETARY", isSaving: true });

    await act(async () => {
      pending.reject(makeRoleTakenError());
    });

    // O segundo aluno volta ao estado anterior e o primeiro continua como o único Secretário de Quadro
    expect(result.current.students).toEqual([makeRow(boardSecretary, false), makeRow(makeOtherStudent(), false)]);
    expect(result.current.error).toMatch(ROLE_TAKEN_MESSAGE);
  });

  it("Deve limpar o aviso de recusa quando a próxima atribuição é salva", async () => {
    service.assignRole
      .mockRejectedValueOnce(makeRoleTakenError())
      .mockResolvedValueOnce(makeAssignment({
        studentId: OTHER_STUDENT_ID, studentName: "Bruno Lima", role: "TABLE_SECRETARY", extraGrade: 0.5,
      }));
    const { result } = renderSessionRolesHook();

    await act(async () => {
      await result.current.assignRole(OTHER_STUDENT_ID, "BOARD_SECRETARY", 0.5);
    });
    expect(result.current.error).toMatch(ROLE_TAKEN_MESSAGE);

    await act(async () => {
      await result.current.assignRole(OTHER_STUDENT_ID, "TABLE_SECRETARY", 0.5);
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.students[1]).toEqual(
      makeRow(makeOtherStudent({ role: "TABLE_SECRETARY", extraGrade: 0.5 }), false),
    );
  });
});
