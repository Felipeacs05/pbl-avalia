// src/hooks/useCarometro.ts
import { useState, useEffect, useCallback } from "react";
import type { Student } from "../types/student";
import { carometroService } from "../services/carometroService";

export function useCarometro(roomId: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!roomId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await carometroService.getStudentsByRoom(roomId);
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
        const data = await carometroService.getStudentsByRoom(roomId);
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
    async (studentId: string) => {
      if (!roomId) return;
      try {
        const updated = await carometroService.removeStudentFromRoom(
          roomId,
          studentId
        );
        setStudents(updated);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao remover aluno");
      }
    },
    [roomId]
  );

  return {
    students,
    isLoading,
    error,
    refreshStudents: fetchStudents,
    removeStudent,
  };
}
