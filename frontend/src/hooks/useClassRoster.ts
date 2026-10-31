import { useState, useEffect, useCallback } from "react";
import { classRosterService } from "@/services/classRosterService";
import type { ClassRosterStudent } from "@/types/classRoster";

export function useClassRoster(roomId: string) {
  const [students, setStudents] = useState<ClassRosterStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoster = useCallback(async () => {
    try {
      const data = await classRosterService.fetchClassRoster(roomId);
      setStudents(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  return {
    students,
    isLoading,
  };
}
