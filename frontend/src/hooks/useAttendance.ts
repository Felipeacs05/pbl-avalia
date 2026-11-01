// src/hooks/useAttendance.ts
import { useCallback, useRef, useState } from "react";
import type {
  AttendanceRow,
  AttendanceStatus,
  SessionStudent,
} from "../types/attendance";
import { attendanceService } from "../services/attendanceService";

const FALLBACK_ERROR = "Não foi possível salvar a presença. Tente novamente.";

interface ConfirmedRecord {
  status: AttendanceStatus | null;
  recordedAt: string | null;
}

interface PendingState {
  /** Quantidade de salvamentos em andamento do aluno. */
  count: number;
  /** Número do último toque: só ele decide o estado final da linha. */
  latestRequest: number;
}

function toRow(student: SessionStudent): AttendanceRow {
  return { ...student, isSaving: false };
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string" && message) return message;
  }
  return FALLBACK_ERROR;
}

/**
 * Chamada otimista: o toque marca o status na hora, o salvamento corre em segundo
 * plano e, se o servidor falhar (timeout, 403...), a linha volta ao último estado
 * confirmado e o erro é exposto em `error`.
 */
export function useAttendance(sessionId: string, initialStudents: SessionStudent[]) {
  const [students, setStudents] = useState<AttendanceRow[]>(() => initialStudents.map(toRow));
  const [error, setError] = useState<string | null>(null);

  // Último estado salvo no servidor por aluno (usado para desfazer a marcação otimista).
  const confirmedRef = useRef(new Map<string, ConfirmedRecord>());
  const pendingRef = useRef(new Map<string, PendingState>());

  const updateRow = useCallback((studentId: string, changes: Partial<AttendanceRow>) => {
    setStudents((current) =>
      current.map((row) => (row.id === studentId ? { ...row, ...changes } : row)),
    );
  }, []);

  const changeStatus = useCallback(
    async (studentId: string, status: AttendanceStatus): Promise<void> => {
      const confirmed =
        confirmedRef.current.get(studentId) ??
        (() => {
          const original = initialStudents.find((student) => student.id === studentId);
          return { status: original?.status ?? null, recordedAt: original?.recordedAt ?? null };
        })();

      const pending = pendingRef.current.get(studentId) ?? { count: 0, latestRequest: 0 };
      pending.count += 1;
      pending.latestRequest += 1;
      const requestNumber = pending.latestRequest;
      pendingRef.current.set(studentId, pending);

      // Marca na hora; o horário só muda quando o servidor responder.
      setError(null);
      updateRow(studentId, { status, isSaving: true });

      try {
        const saved = await attendanceService.registerAttendance(sessionId, studentId, status);
        confirmedRef.current.set(studentId, {
          status: saved.status,
          recordedAt: saved.recordedAt,
        });
        pending.count -= 1;
        if (requestNumber === pending.latestRequest) {
          updateRow(studentId, {
            status: saved.status,
            recordedAt: saved.recordedAt,
            isSaving: pending.count > 0,
          });
        }
      } catch (err) {
        pending.count -= 1;
        if (requestNumber === pending.latestRequest) {
          const lastSaved = confirmedRef.current.get(studentId) ?? confirmed;
          updateRow(studentId, {
            status: lastSaved.status,
            recordedAt: lastSaved.recordedAt,
            isSaving: pending.count > 0,
          });
          setError(getErrorMessage(err));
        }
      }
    },
    [sessionId, initialStudents, updateRow],
  );

  const assignRole = useCallback((studentId: string, newRole: string | undefined) => {
    attendanceService.updateRole(sessionId, studentId, newRole);
    setStudents((current) =>
      current.map((student) => {
        // Regra de unicidade PBL: apenas UM Coordenador, UM Quadro e UMA Mesa por sessão.
        // Se um papel já está ocupado por outro aluno, desatribui dele automaticamente.
        if (
          newRole &&
          student.id !== studentId &&
          student.role?.trim().toLowerCase() === newRole.trim().toLowerCase()
        ) {
          attendanceService.updateRole(sessionId, student.id, undefined);
          return { ...student, role: undefined };
        }
        if (student.id === studentId) {
          return { ...student, role: newRole };
        }
        return student;
      }),
    );
  }, [sessionId]);

  const updateTags = useCallback((studentId: string, newTags: string[]) => {
    attendanceService.updateTags(sessionId, studentId, newTags);
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId ? { ...student, tags: newTags } : student,
      ),
    );
  }, [sessionId]);

  return { students, error, changeStatus, assignRole, updateTags };
}
