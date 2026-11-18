// src/hooks/usePhotoRoster.ts
import { useState, useEffect, useCallback } from "react";
import type { Student } from "../types/student";
import { photoRosterService } from "../services/photoRosterService";

export function usePhotoRoster(roomId: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!roomId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await photoRosterService.getStudentsByRoom(roomId);
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar alunos");
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!roomId) return;
      try {
        setIsLoading(true);
        setError(null);
        const data = await photoRosterService.getStudentsByRoom(roomId);
        if (isMounted) {
          setStudents(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro ao carregar alunos");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const removeStudent = useCallback(
    async (studentId: string): Promise<boolean> => {
      if (!roomId) return false;
      try {
        setIsRemoving(true);
        setRemoveError(null);
        const updated = await photoRosterService.removeStudentFromRoom(
          roomId,
          studentId
        );
        setStudents(updated);
        return true;
      } catch (err) {
        setRemoveError(
          err instanceof Error && err.message.trim()
            ? err.message
            : "Erro ao remover aluno"
        );
        return false;
      } finally {
        setIsRemoving(false);
      }
    },
    [roomId]
  );

  return {
    students,
    isLoading,
    error,
    isRemoving,
    removeError,
    refreshStudents: fetchStudents,
    removeStudent,
  };
}
