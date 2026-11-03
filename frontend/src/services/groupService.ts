// src/services/groupService.ts
import type { Group, Student } from "@/types/group";
import { groupMocks } from "@/mocks/group.mock";
import { USE_REAL_API } from "./apiMode";
import { api } from "./api"; // Instância do Axios configurada com baseUrl e Token JWT

export const groupService = {
  fetchGroups: async (roomId: string): Promise<Group[]> => {
    if (!USE_REAL_API) return [...groupMocks.groups];
    const response = await api.get<Group[]>(`/rooms/${roomId}/groups`);
    return response.data;
  },

  createGroup: async (roomId: string, name: string): Promise<void> => {
    if (!USE_REAL_API) {
      const newGroup: Group = { id: `g_${Date.now()}`, name, members: [] };
      groupMocks.groups.push(newGroup);
      return;
    }
    await api.post(`/rooms/${roomId}/groups`, { name });
  },

  updateGroup: async (arg1: string, arg2: string, arg3?: string): Promise<void> => {
    const isNested = arg3 !== undefined;
    const roomId = isNested ? arg1 : undefined;
    const groupId = isNested ? arg2 : arg1;
    const name = isNested ? arg3 : arg2;

    if (!USE_REAL_API) {
      const group = groupMocks.groups.find(g => g.id === groupId);
      if (group) group.name = name;
      return;
    }
    const url = roomId ? `/rooms/${roomId}/groups/${groupId}` : `/groups/${groupId}`;
    const method = roomId ? "patch" : "put";
    await api[method](url, { name });
  },

  deleteGroup: async (arg1: string, arg2?: string): Promise<void> => {
    const isNested = arg2 !== undefined;
    const roomId = isNested ? arg1 : undefined;
    const groupId = isNested ? arg2 : arg1;

    if (!USE_REAL_API) {
      const group = groupMocks.groups.find(g => g.id === groupId);
      if (group) {
        groupMocks.availableStudents.push(...group.members);
      }
      groupMocks.groups = groupMocks.groups.filter(g => g.id !== groupId);
      return;
    }
    const url = roomId ? `/rooms/${roomId}/groups/${groupId}` : `/groups/${groupId}`;
    await api.delete(url);
  },

  fetchAvailableStudents: async (roomId: string): Promise<Student[]> => {
    if (!USE_REAL_API) return [...groupMocks.availableStudents];
    const response = await api.get<Student[]>(`/rooms/${roomId}/groups/available-students`);
    return response.data;
  },

  addMember: async (arg1: string, arg2: string, arg3?: string): Promise<void> => {
    const isNested = arg3 !== undefined;
    const roomId = isNested ? arg1 : undefined;
    const groupId = isNested ? arg2 : arg1;
    const studentId = isNested ? arg3 : arg2;

    if (!USE_REAL_API) {
      const studentIndex = groupMocks.availableStudents.findIndex(s => s.id === studentId);
      if (studentIndex > -1) {
        const student = groupMocks.availableStudents.splice(studentIndex, 1)[0];
        const group = groupMocks.groups.find(g => g.id === groupId);
        if (group) group.members.push(student);
      }
      return;
    }
    const url = roomId ? `/rooms/${roomId}/groups/${groupId}/members` : `/groups/${groupId}/members`;
    
    try {
      await api.post(url, { studentId });
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      throw new Error(errorData?.message || "Failed to add member");
    }
  },

  removeMember: async (arg1: string, arg2: string, arg3?: string): Promise<void> => {
    const isNested = arg3 !== undefined;
    const roomId = isNested ? arg1 : undefined;
    const groupId = isNested ? arg2 : arg1;
    const studentId = isNested ? arg3 : arg2;

    if (!USE_REAL_API) {
      const group = groupMocks.groups.find(g => g.id === groupId);
      if (group) {
        const studentIndex = group.members.findIndex(s => s.id === studentId);
        if (studentIndex > -1) {
          const student = group.members.splice(studentIndex, 1)[0];
          groupMocks.availableStudents.push(student);
        }
      }
      return;
    }
    const url = roomId ? `/rooms/${roomId}/groups/${groupId}/members/${studentId}` : `/groups/${groupId}/members/${studentId}`;
    await api.delete(url);
  },

  fetchMyGroup: async (roomId: string): Promise<Group | null> => {
    if (!USE_REAL_API) return groupMocks.groups[0] || null;
    try {
      const response = await api.get<Group>(`/rooms/${roomId}/groups/me`);
      return response.data;
    } catch {
      return null;
    }
  },
};