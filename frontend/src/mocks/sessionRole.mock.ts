// src/mocks/sessionRole.mock.ts

// Simula o backend da US10 enquanto o endpoint não existe.
// Regra da tela: cada papel fica com um aluno só, e atribuir um papel ocupado TRANSFERE o papel
// o aluno anterior vira membro. Os testes da US10 esperam que o backend recuse com 422;
// se o backend mantiver a recusa, a tela mostra a mensagem dele e desfaz a troca.
// O papel fica gravado no mock da sessão, então a chamada e a avaliação também enxergam.
import type { SessionRole, SessionRoleAssignment } from "../types/sessionRole";
import { sessionMock } from "./session.mock";
import {
  SESSION_ROLE_LABELS,
  toSessionRole,
} from "../components/features/session-roles/sessionRoleOptions";

const MOCK_LATENCY_MS = 450;

export const sessionRoleMock = {
  assignRole(
    sessionId: string,
    role: SessionRole,
    studentId: string,
    extraGrade: number,
  ): Promise<SessionRoleAssignment> {
    return new Promise((resolve) =>
      setTimeout(() => {
        const students = sessionMock.getStudents(sessionId);
        const holder = students.find((s) => toSessionRole(s.role) === role);

        // Transferência: o aluno que tinha o papel fica sem papel
        if (holder && holder.id !== studentId) {
          sessionMock.updateStudentRole(sessionId, holder.id, undefined, null);
        }

        // Guarda o rótulo em português: é o que as telas antigas (ex.: avaliação) exibem
        sessionMock.updateStudentRole(sessionId, studentId, SESSION_ROLE_LABELS[role], extraGrade);

        resolve({
          id: `role_${sessionId}_${role}`,
          sessionId,
          studentId,
          studentName: students.find((s) => s.id === studentId)?.name ?? "",
          role,
          extraGrade,
        });
      }, MOCK_LATENCY_MS),
    );
  },

  removeRole(sessionId: string, role: SessionRole): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(() => {
        const holder = sessionMock.getStudents(sessionId).find((s) => toSessionRole(s.role) === role);
        if (holder) sessionMock.updateStudentRole(sessionId, holder.id, undefined, null);
        resolve();
      }, MOCK_LATENCY_MS),
    );
  },
};
