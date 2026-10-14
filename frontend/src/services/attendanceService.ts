// src/services/attendanceService.ts
import type {
  Attendance,
  AttendanceRequestError,
  AttendanceStatus,
} from "../types/attendance";
import type { SessionRoster } from "../types/session";
import { sessionMock } from "../mocks/session.mock";

const BASE_URL = "/api/v1/sessions";
const IS_TEST = process.env.NODE_ENV === "test";

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

/** O backend responde o 403 em texto puro e outros erros em JSON ({ message }). */
async function toRequestError(response: Response): Promise<AttendanceRequestError> {
  const text = (await response.text()).trim();
  let message = text;
  try {
    const body: unknown = JSON.parse(text);
    if (typeof body === "object" && body !== null && "message" in body) {
      message = String((body as { message: unknown }).message);
    }
  } catch {
    // corpo não é JSON: mantém o texto puro
  }
  return { status: response.status, message: message || GENERIC_MESSAGE };
}

function normalizeError(error: unknown): AttendanceRequestError {
  if (isRequestError(error)) return error;
  if ((error as { name?: string } | null)?.name === "AbortError") {
    return { status: 0, message: TIMEOUT_MESSAGE };
  }
  return { status: 0, message: NETWORK_MESSAGE };
}

export const attendanceService = {
  async fetchSessionRoster(sessionId: string): Promise<SessionRoster> {
    if (!IS_TEST) return sessionMock.fetchRoster(sessionId);

    const response = await fetch(`${BASE_URL}/${sessionId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw await toRequestError(response);
    return response.json();
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
    if (!IS_TEST) return sessionMock.registerAttendance(sessionId, studentId, status);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ATTENDANCE_TIMEOUT_MS);
    try {
      const response = await fetch(`${BASE_URL}/${sessionId}/attendances/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        signal: controller.signal,
      });
      if (!response.ok) throw await toRequestError(response);
      return (await response.json()) as Attendance;
    } catch (error) {
      throw normalizeError(error);
    } finally {
      clearTimeout(timer);
    }
  },
};
