import type { Group, Student } from "@/types/group";
import { groupMocks } from "@/mocks/group.mock";
import { USE_REAL_API } from "./apiMode";

export const groupService = {
  fetchGroups: async (roomId: string): Promise<Group[]> => {
    if (!USE_REAL_API) return [...groupMocks.groups];
    const response = await fetch(`/api/v1/rooms/${roomId}/groups`);
    if (!response.ok) throw new Error("Failed to fetch groups");
    return response.json();
  },

  createGroup: async (roomId: string, name: string): Promise<void> => {
    if (!USE_REAL_API) {
      const newGroup: Group = { id: `g_${Date.now()}`, name, members: [] };
      groupMocks.groups.push(newGroup);
      return;
    }
    const response = await fetch(`/api/v1/rooms/${roomId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Failed to create group");
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
    const url = roomId ? `/api/v1/rooms/${roomId}/groups/${groupId}` : `/api/v1/groups/${groupId}`;
    const method = roomId ? "PATCH" : "PUT";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Failed to update group");
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
    const url = roomId ? `/api/v1/rooms/${roomId}/groups/${groupId}` : `/api/v1/groups/${groupId}`;
    const response = await fetch(url, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete group");
  },

  fetchAvailableStudents: async (roomId: string): Promise<Student[]> => {
    if (!USE_REAL_API) return [...groupMocks.availableStudents];
    const response = await fetch(`/api/v1/rooms/${roomId}/groups/available-students`);
    if (!response.ok) throw new Error("Failed to fetch available students");
    return response.json();
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
    const url = roomId ? `/api/v1/rooms/${roomId}/groups/${groupId}/members` : `/api/v1/groups/${groupId}/members`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Failed to add member");
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
    const url = roomId ? `/api/v1/rooms/${roomId}/groups/${groupId}/members/${studentId}` : `/api/v1/groups/${groupId}/members/${studentId}`;
    const response = await fetch(url, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to remove member");
  },

  fetchMyGroup: async (roomId: string): Promise<Group | null> => {
    if (!USE_REAL_API) return groupMocks.groups[0] || null;
    const response = await fetch(`/api/v1/rooms/${roomId}/groups/me`);
    if (!response.ok) throw new Error("Failed to fetch my group");
    return response.json();
  },
};
