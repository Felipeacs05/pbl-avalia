import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAttendance } from "@/hooks/useAttendance";
import { attendanceService } from "@/services/attendanceService";
import type { Attendance } from "@/types/attendance";
import {
  FORBIDDEN_MESSAGE,
  makeAttendance,
  makeForbiddenError,
  makeOtherStudent,
  makeRow,
  makeStudent,
  makeTimeoutError,
  OTHER_STUDENT_ID,
  PREVIOUS_RECORDED_AT,
  RECORDED_AT,
  SESSION_ID,
  STUDENT_ID,
  TIMEOUT_MESSAGE,
} from "../fixtures";

vi.mock("@/services/attendanceService", () => ({
  attendanceService: { registerAttendance: vi.fn() },
}));

const service = vi.mocked(attendanceService);

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
const presentStudent = makeStudent({ status: "PRESENT", recordedAt: PREVIOUS_RECORDED_AT });
const initialStudents = [presentStudent, makeOtherStudent()];

function renderAttendanceHook() {
  return renderHook(() => useAttendance(SESSION_ID, initialStudents));
}

describe("[US09] useAttendance", () => {
  it("Deve expor os alunos recebidos, sem salvamento em andamento e sem chamar o service", () => {
    const { result } = renderAttendanceHook();

    expect(result.current.students).toEqual([makeRow(presentStudent), makeRow(makeOtherStudent())]);
    expect(result.current.error).toBeNull();
    expect(service.registerAttendance).not.toHaveBeenCalled();
  });

  it("Deve marcar o novo status na hora e salvar em segundo plano, guardando o horário devolvido pelo servidor", async () => {
    const pending = deferred<Attendance>();
    service.registerAttendance.mockReturnValue(pending.promise);
    const { result } = renderAttendanceHook();

    // Sem await: o toque não pode esperar a rede para refletir na tela
    act(() => {
      void result.current.changeStatus(STUDENT_ID, "LATE");
    });

    expect(service.registerAttendance).toHaveBeenCalledTimes(1);
    expect(service.registerAttendance).toHaveBeenCalledWith(SESSION_ID, STUDENT_ID, "LATE");
    expect(result.current.students[0]).toMatchObject({ status: "LATE", isSaving: true });

    await act(async () => {
      pending.resolve(makeAttendance({ status: "LATE", recordedAt: RECORDED_AT }));
    });

    expect(result.current.students[0]).toEqual(
      makeRow(makeStudent({ status: "LATE", recordedAt: RECORDED_AT }), false),
    );
    expect(result.current.error).toBeNull();
  });

  it("Deve permitir alterar outro aluno enquanto um salvamento ainda está pendente, tratando cada resposta só na sua linha", async () => {
    const first = deferred<Attendance>();
    const second = deferred<Attendance>();
    service.registerAttendance.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderAttendanceHook();

    act(() => {
      void result.current.changeStatus(STUDENT_ID, "ABSENT");
    });
    act(() => {
      void result.current.changeStatus(OTHER_STUDENT_ID, "PRESENT");
    });

    expect(service.registerAttendance).toHaveBeenNthCalledWith(2, SESSION_ID, OTHER_STUDENT_ID, "PRESENT");
    expect(result.current.students.map((s) => s.isSaving)).toEqual([true, true]);

    // As respostas chegam fora de ordem: a segunda grava, a primeira expira
    await act(async () => {
      second.resolve(makeAttendance({ studentId: OTHER_STUDENT_ID, studentName: "Bruno Lima", status: "PRESENT" }));
    });
    // A resposta do segundo aluno não pode tocar na linha do primeiro, que segue salvando
    expect(result.current.students[0]).toEqual(makeRow(makeStudent({ status: "ABSENT", recordedAt: PREVIOUS_RECORDED_AT }), true));
    await act(async () => {
      first.reject(makeTimeoutError());
    });

    expect(result.current.students).toEqual([
      makeRow(presentStudent, false),
      makeRow(makeOtherStudent({ status: "PRESENT", recordedAt: RECORDED_AT }), false),
    ]);
  });

  it("[QA] Deve voltar ao status e ao horário anteriores e expor a mensagem de timeout quando o salvamento expira", async () => {
    service.registerAttendance.mockRejectedValue(makeTimeoutError());
    const { result } = renderAttendanceHook();

    await act(async () => {
      await result.current.changeStatus(STUDENT_ID, "ABSENT");
    });

    expect(result.current.students[0]).toEqual(makeRow(presentStudent, false));
    expect(result.current.error).toMatch(TIMEOUT_MESSAGE);
  });

  it("Deve voltar ao status anterior e expor a mensagem do backend quando a alteração é recusada com 403", async () => {
    service.registerAttendance.mockRejectedValue(makeForbiddenError());
    const { result } = renderAttendanceHook();

    await act(async () => {
      await result.current.changeStatus(STUDENT_ID, "ABSENT");
    });

    expect(result.current.students[0]).toEqual(makeRow(presentStudent, false));
    expect(result.current.error).toMatch(FORBIDDEN_MESSAGE);
  });

  it("[QA] Deve limpar o aviso de timeout quando o reenvio é salvo", async () => {
    service.registerAttendance
      .mockRejectedValueOnce(makeTimeoutError())
      .mockResolvedValueOnce(makeAttendance({ status: "ABSENT", recordedAt: RECORDED_AT }));
    const { result } = renderAttendanceHook();

    await act(async () => {
      await result.current.changeStatus(STUDENT_ID, "ABSENT");
    });
    expect(result.current.error).toMatch(TIMEOUT_MESSAGE);

    await act(async () => {
      await result.current.changeStatus(STUDENT_ID, "ABSENT");
    });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.students[0]).toEqual(
      makeRow(makeStudent({ status: "ABSENT", recordedAt: RECORDED_AT }), false),
    );
  });
});
