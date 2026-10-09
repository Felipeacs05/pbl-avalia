import { useState, useEffect, useCallback } from "react";
import { groupService } from "@/services/groupService";
import type { Group } from "@/types/group";

export function useMyGroup(roomId: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const fetchedGroup = await groupService.fetchMyGroup(roomId);
      setGroup(fetchedGroup);
    } catch (error) {
      console.error(error);
    }
  }, [roomId]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      await loadData();
      if (mounted) setIsLoading(false);
    }
    init();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  return {
    group,
    isLoading,
  };
}

