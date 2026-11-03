// src/services/attendanceService.ts
import type {
  Attendance,
  AttendanceRequestError,
  AttendanceStatus,
} from "../types/attendance";
import type { SessionRoster } from "../types/session";
import { sessionMock } from "../mocks/session.mock";
import { USE_REAL_API } from "./apiMode";
import { api } from "./api"; // Instância do Axios configurada com baseUrl e Token JWT
import axios from "axios";

export const ATTENDANCE_TIMEOUT_MS = 8000;

const TIMEOUT_MESSAGE =
  "Tempo esgotado ao salvar a presença. Verifique sua conexão e tente novamente.";
const NETWORK_MESSAGE =
  "Não foi possível salvar a presença. Verifique sua conexão e tente novamente.";
const GENERIC_MESSAGE = "Não foi possível salvar a presença. Tente novamente.";

function isRequestError(error: unknown): error is AttendanceRequestError {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as AttendanceRequestError).status === "number" &&
    typeof (error as AttendanceRequestError).message === "string"
  );
}

function normalizeError(error: unknown): AttendanceRequestError {
  if (isRequestError(error)) return error;
  
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return { status: 0, message: TIMEOUT_MESSAGE };
    }
    if (error.response) {
      const data = error.response.data;
      let message = GENERIC_MESSAGE;
      
      if (typeof data === "string") {
        message = data.trim() || GENERIC_MESSAGE;
      } else if (data && typeof data === "object" && "message" in data) {
        message = String((data as { message: unknown }).message);
      }
      
      return { status: error.response.status, message };
    }
  }
  
  return { status: 0, message: NETWORK_MESSAGE };
}

export const attendanceService = {
  async fetchSessionRoster(sessionId: string): Promise<SessionRoster> {
    if (!USE_REAL_API) return sessionMock.fetchRoster(sessionId);

    try {
      const response = await api.get<SessionRoster>(`/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  /**
   * Registra o status do aluno na sessão. O horário não é enviado: quem define
   * é o servidor. Rejeita com { status, message }; status 0 indica timeout.
   */
  async registerAttendance(
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
  ): Promise<Attendance> {
    if (!USE_REAL_API) return sessionMock.registerAttendance(sessionId, studentId, status);

    try {
      const response = await api.put<Attendance>(
        `/sessions/${sessionId}/attendances/${studentId}`,
        { status },
        { timeout: ATTENDANCE_TIMEOUT_MS }
      );
      return response.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  updateRole(sessionId: string, studentId: string, role: string | undefined): void {
    if (!USE_REAL_API) {
      sessionMock.updateStudentRole(sessionId, studentId, role);
    }
  },

  updateTags(sessionId: string, studentId: string, tags: string[]): void {
    if (!USE_REAL_API) {
      sessionMock.updateStudentTags(sessionId, studentId, tags);
    }
  },
};