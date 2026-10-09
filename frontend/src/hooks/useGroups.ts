import { useState, useEffect, useCallback } from "react";
import { groupService } from "@/services/groupService";
import type { Group, Student } from "@/types/group";

export function useGroups(roomId: string) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [fetchedGroups, fetchedAvailableStudents] = await Promise.all([
        groupService.fetchGroups(roomId),
        groupService.fetchAvailableStudents(roomId),
      ]);
      setGroups(fetchedGroups);
      setAvailableStudents(fetchedAvailableStudents);
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

  const createGroup = async (name: string) => {
    await groupService.createGroup(roomId, name);
    await loadData();
  };

  const updateGroup = async (id: string, name: string) => {
    await groupService.updateGroup(id, name);
    await loadData();
  };

  const deleteGroup = async (id: string) => {
    await groupService.deleteGroup(id);
    await loadData();
  };

  const addMember = async (groupId: string, studentId: string) => {
    await groupService.addMember(groupId, studentId);
    await loadData();
  };

  const removeMember = async (groupId: string, studentId: string) => {
    await groupService.removeMember(groupId, studentId);
    await loadData();
  };

  return {
    groups,
    availableStudents,
    isLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
  };
}

