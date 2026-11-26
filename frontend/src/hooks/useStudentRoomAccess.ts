"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRooms } from "./useRooms";

const STUDENT_ROOMS_ROUTE = "/student-rooms";

/**
 * Garante que o estudante possui vínculo ativo com a sala antes de exibir conteúdo interno.
 */
export function useStudentRoomAccess(roomId: string) {
  const router = useRouter();
  const { rooms, isLoading } = useRooms("student");
  const room = rooms.find((r) => r.id === roomId);
  const hasAccess = !isLoading && Boolean(room);

  useEffect(() => {
    if (!isLoading && !room) {
      router.replace(STUDENT_ROOMS_ROUTE);
    }
  }, [isLoading, room, router]);

  return {
    room,
    isCheckingAccess: isLoading,
    hasAccess,
  };
}
