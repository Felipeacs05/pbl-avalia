// src/hooks/useClassRoster.ts
"use client";

import { useState, useEffect } from "react";
import { classRosterService } from "../services/classRosterService";
import type { ClassRosterStudent } from "../types/classRoster";

export function useClassRoster(roomId: string) {
  const [students, setStudents] = useState<ClassRosterStudent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    classRosterService
      .fetchClassRoster(roomId)
      .then((data) => {
        if (active) {
          setStudents(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || "Erro ao carregar alunos.");
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [roomId]);

  return { students, isLoading, error };
}
