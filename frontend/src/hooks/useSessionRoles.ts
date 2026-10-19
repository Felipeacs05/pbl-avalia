// src/hooks/useSessionRoles.ts

// atribuição otimista de papéis. O papel aparece na hora (badge/ícone), o salvamento corre
// em segundo plano e, se o backend recusar (422, 403...), as linhas voltam ao último estado
// confirmado e a mensagem do backend fica em `error`.
// Transferência: dar a um aluno um papel que já está com outro tira o papel do anterior na hora.
"use client";

import { useCallback, useRef, useState } from "react";
import type {
  SessionRole,
  SessionRoleRow,
  SessionRoleStudent,
} from "../types/sessionRole";
import { sessionRoleService } from "../services/sessionRoleService";

const FALLBACK_ERROR = "Não foi possível atribuir o papel. Tente novamente.";

interface RoleState {
  role: SessionRole | null;
  extraGrade: number | null;
}

function toRow(student: SessionRoleStudent): SessionRoleRow {
  return { ...student, isSaving: false };
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string" && message) return message;
  }
  return FALLBACK_ERROR;
}

/** `initialStudents` só é lido na montagem (use `key` para recarregar). */
export function useSessionRoles(sessionId: string, initialStudents: SessionRoleStudent[]) {
  const [students, setStudents] = useState<SessionRoleRow[]>(() => initialStudents.map(toRow));
  const [error, setError] = useState<string | null>(null);

  // Linhas atuais, para saber quem perde o papel numa transferência
  const rowsRef = useRef(students);
  rowsRef.current = students;
  // Último estado gravado no servidor por aluno (para desfazer o destaque otimista)
  const confirmedRef = useRef(new Map<string, RoleState>());
  // Número do último clique por aluno: só a resposta mais recente decide o estado final
  const latestRequestRef = useRef(new Map<string, number>());

  const confirmedOf = useCallback(
    (studentId: string): RoleState => {
      const saved = confirmedRef.current.get(studentId);
      if (saved) return saved;
      const original = initialStudents.find((s) => s.id === studentId);
      return { role: original?.role ?? null, extraGrade: original?.extraGrade ?? null };
    },
    [initialStudents],
  );

  const updateRows = useCallback((changes: Map<string, Partial<SessionRoleRow>>) => {
    setStudents((current) =>
      current.map((row) => (changes.has(row.id) ? { ...row, ...changes.get(row.id) } : row)),
    );
  }, []);

  /** Envia a mudança: `role = null` tira o papel do aluno. */
  const saveRole = useCallback(
    async (studentId: string, role: SessionRole | null, extraGrade: number | null): Promise<void> => {
      const requestNumber = (latestRequestRef.current.get(studentId) ?? 0) + 1;
      latestRequestRef.current.set(studentId, requestNumber);
      const isLatest = () => latestRequestRef.current.get(studentId) === requestNumber;

      const previousRole = rowsRef.current.find((r) => r.id === studentId)?.role ?? null;
      // Quem tinha o mesmo papel perde ele (transferência)
      const displaced = role
        ? rowsRef.current.filter((r) => r.id !== studentId && r.role === role).map((r) => r.id)
        : [];

      // Destaque imediato: não espera a rede
      setError(null);
      const optimistic = new Map<string, Partial<SessionRoleRow>>([[studentId, { role, extraGrade, isSaving: true }]]);
      displaced.forEach((id) => optimistic.set(id, { role: null, extraGrade: null }));
      updateRows(optimistic);

      try {
        let finalState: RoleState;
        if (role) {
          const saved = await sessionRoleService.assignRole(sessionId, role, studentId, extraGrade ?? 0);
          // A linha final vem da resposta do servidor, não do clique
          finalState = { role: saved.role, extraGrade: saved.extraGrade };
        } else {
          if (previousRole) await sessionRoleService.removeRole(sessionId, previousRole);
          finalState = { role: null, extraGrade: null };
        }
        confirmedRef.current.set(studentId, finalState);
        displaced.forEach((id) => confirmedRef.current.set(id, { role: null, extraGrade: null }));
        if (isLatest()) updateRows(new Map([[studentId, { ...finalState, isSaving: false }]]));
      } catch (err) {
        if (isLatest()) {
          // Desfaz tudo: o aluno volta ao que tinha e quem "perdeu" o papel recupera
          const rollback = new Map<string, Partial<SessionRoleRow>>([[studentId, { ...confirmedOf(studentId), isSaving: false }]]);
          displaced.forEach((id) => rollback.set(id, confirmedOf(id)));
          updateRows(rollback);
          setError(getErrorMessage(err));
        }
      }
    },
    [sessionId, updateRows, confirmedOf],
  );

  // Mesma assinatura que os testes da US10 usam
  const assignRole = useCallback(
    (studentId: string, role: SessionRole, extraGrade: number) => saveRole(studentId, role, extraGrade),
    [saveRole],
  );

  const removeRole = useCallback((studentId: string) => saveRole(studentId, null, null), [saveRole]);

  const clearError = useCallback(() => setError(null), []);

  return { students, error, assignRole, removeRole, clearError };
}
