// src/services/groupService.ts
import type { Group, Student } from "@/types/group";
import { groupMocks } from "@/mocks/group.mock";
import { USE_REAL_API } from "./apiMode";
import {
  getAuthHeaders,
  mapGroupFromApi,
  mapGroupMemberFromApi,
} from "./mappers";

const API_BASE = "/api/v1";

export const groupService = {
  fetchGroups: async (roomId: string): Promise<Group[]> => {
    if (!USE_REAL_API) return [...groupMocks.groups];
    const response = await fetch(`${API_BASE}/rooms/${roomId}/groups`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch groups");
    }
    const data = (await response.json()) as Record<string, unknown>[];
    return Array.isArray(data) ? data.map((item) => mapGroupFromApi(item)) : [];
  },

  createGroup: async (roomId: string, name: string): Promise<void> => {
    if (!USE_REAL_API) {
      const newGroup: Group = { id: `g_${Date.now()}`, name, members: [] };
      groupMocks.groups.push(newGroup);
      return;
    }
    const response = await fetch(`${API_BASE}/rooms/${roomId}/groups`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error("Failed to create group");
    }
  },

  updateGroup: async (arg1: string, arg2: string, arg3?: string): Promise<void> => {
    const isNested = arg3 !== undefined;
    const roomId = isNested ? arg1 : undefined;
    const groupId = isNested ? arg2 : arg1;
    const name = isNested ? arg3 : arg2;

    if (!USE_REAL_API) {
      const group = groupMocks.groups.find((g) => g.id === groupId);
      if (group) group.name = name;
      return;
    }
    const url = roomId
      ? `${API_BASE}/rooms/${roomId}/groups/${groupId}`
      : `${API_BASE}/groups/${groupId}`;
    const method = roomId ? "PATCH" : "PUT";
    const response = await fetch(url, {
      method,
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error("Failed to update group");
    }
  },

  deleteGroup: async (arg1: string, arg2?: string): Promise<void> => {
    const isNested = arg2 !== undefined;
    const roomId = isNested ? arg1 : undefined;
    const groupId = isNested ? arg2 : arg1;

    if (!USE_REAL_API) {
      const group = groupMocks.groups.find((g) => g.id === groupId);
      if (group) {
        groupMocks.availableStudents.push(...group.members);
      }
      groupMocks.groups = groupMocks.groups.filter((g) => g.id !== groupId);
      return;
    }
    const url = roomId
      ? `${API_BASE}/rooms/${roomId}/groups/${groupId}`
      : `${API_BASE}/groups/${groupId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to delete group");
    }
  },

  fetchAvailableStudents: async (roomId: string): Promise<Student[]> => {
    if (!USE_REAL_API) return [...groupMocks.availableStudents];
    const response = await fetch(`${API_BASE}/rooms/${roomId}/groups/available-students`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch available students");
    }
    const data = (await response.json()) as Record<string, unknown>[];
    return Array.isArray(data) ? data.map((item) => mapGroupMemberFromApi(item)) : [];
  },

  addMember: async (arg1: string, arg2: string, arg3?: string): Promise<void> => {
    const isNested = arg3 !== undefined;
    const roomId = isNested ? arg1 : undefined;
    const groupId = isNested ? arg2 : arg1;
    const studentId = isNested ? arg3 : arg2;

    if (!USE_REAL_API) {
      const studentIndex = groupMocks.availableStudents.findIndex((s) => s.id === studentId);
      if (studentIndex > -1) {
        const student = groupMocks.availableStudents.splice(studentIndex, 1)[0];
        const group = groupMocks.groups.find((g) => g.id === groupId);
        if (group) group.members.push(student);
      }
      return;
    }
    const url = roomId
      ? `${API_BASE}/rooms/${roomId}/groups/${groupId}/members`
      : `${API_BASE}/groups/${groupId}/members`;

    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ studentId }),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error((errBody as { message?: string }).message || "Failed to add member");
    }
  },

  removeMember: async (arg1: string, arg2: string, arg3?: string): Promise<void> => {
    const isNested = arg3 !== undefined;
    const roomId = isNested ? arg1 : undefined;
    const groupId = isNested ? arg2 : arg1;
    const studentId = isNested ? arg3 : arg2;

    if (!USE_REAL_API) {
      const group = groupMocks.groups.find((g) => g.id === groupId);
      if (group) {
        const studentIndex = group.members.findIndex((s) => s.id === studentId);
        if (studentIndex > -1) {
          const student = group.members.splice(studentIndex, 1)[0];
          groupMocks.availableStudents.push(student);
        }
      }
      return;
    }
    const url = roomId
      ? `${API_BASE}/rooms/${roomId}/groups/${groupId}/members/${studentId}`
      : `${API_BASE}/groups/${groupId}/members/${studentId}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error("Failed to remove member");
    }
  },

  fetchMyGroup: async (roomId: string): Promise<Group | null> => {
    if (!USE_REAL_API) return groupMocks.groups[0] || null;
    try {
      const response = await fetch(`${API_BASE}/rooms/${roomId}/groups/me`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as Record<string, unknown> | null;
      return data ? mapGroupFromApi(data) : null;
    } catch {
      return null;
    }
  },
};
