"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { roomService } from "../services/roomService";

const STUDENT_ROOMS_ROUTE = "/student-rooms";
const LOGIN_ROUTE = "/";
const DEFAULT_LEAVE_ERROR = "Não foi possível sair da sala. Tente novamente.";

function parseLeaveError(err: unknown): { status?: number; message: string } {
  if (err && typeof err === "object") {
    const status =
      "status" in err && typeof (err as { status?: unknown }).status === "number"
        ? (err as { status: number }).status
        : undefined;
    const rawMessage = "message" in err ? (err as { message?: unknown }).message : undefined;
    const message =
      typeof rawMessage === "string" && rawMessage.trim().length > 0
        ? rawMessage
        : DEFAULT_LEAVE_ERROR;
    return { status, message };
  }

  if (err instanceof Error && err.message.trim().length > 0) {
    return { message: err.message };
  }

  return { message: DEFAULT_LEAVE_ERROR };
}

/**
 * Gerencia a saída voluntária do estudante de uma sala tutorial,
 * tratando bloqueio imediato das rotas internas, sessão expirada (401) e erros recuperáveis.
 */
export function useLeaveRoom(roomId: string) {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const notifyRoomsSync = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pbl_rooms_sync", String(Date.now()));
        window.dispatchEvent(new CustomEvent("rooms:updated"));
      } catch {}
    }
  };

  const leaveRoom = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;

    inFlightRef.current = true;
    setIsLeaving(true);
    setError(null);

    try {
      await roomService.leaveRoom(roomId);
      notifyRoomsSync();
      router.replace(STUDENT_ROOMS_ROUTE);
      return true;
    } catch (err) {
      const { status, message } = parseLeaveError(err);

      // 404/409 indicam que o aluno já não possui vínculo ativo com a sala.
      if (status === 404 || status === 409) {
        notifyRoomsSync();
        router.replace(STUDENT_ROOMS_ROUTE);
        return true;
      }

      if (status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
        router.replace(LOGIN_ROUTE);
        return false;
      }

      setError(message);
      return false;
    } finally {
      inFlightRef.current = false;
      setIsLeaving(false);
    }
  }, [roomId, router]);

  return {
    leaveRoom,
    isLeaving,
    error,
    clearError,
  };
}
