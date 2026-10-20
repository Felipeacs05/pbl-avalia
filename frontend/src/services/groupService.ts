import type { Group, Student } from "@/types/group";
import { groupMocks } from "@/mocks/group.mock";

export const groupService = {
  fetchGroups: async (roomId: string): Promise<Group[]> => {
    if (process.env.NODE_ENV !== "test") return [...groupMocks.groups];
    const response = await fetch(`/api/v1/rooms/${roomId}/groups`);
    if (!response.ok) throw new Error("Failed to fetch groups");
    return response.json();
  },

  createGroup: async (roomId: string, name: string): Promise<void> => {
    if (process.env.NODE_ENV !== "test") {
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

  updateGroup: async (groupId: string, name: string): Promise<void> => {
    if (process.env.NODE_ENV !== "test") {
      const group = groupMocks.groups.find(g => g.id === groupId);
      if (group) group.name = name;
      return;
    }
    const response = await fetch(`/api/v1/groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Failed to update group");
  },

  deleteGroup: async (groupId: string): Promise<void> => {
    if (process.env.NODE_ENV !== "test") {
      const group = groupMocks.groups.find(g => g.id === groupId);
      if (group) {
        groupMocks.availableStudents.push(...group.members);
      }
      groupMocks.groups = groupMocks.groups.filter(g => g.id !== groupId);
      return;
    }
    const response = await fetch(`/api/v1/groups/${groupId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete group");
  },

  fetchAvailableStudents: async (roomId: string): Promise<Student[]> => {
    if (process.env.NODE_ENV !== "test") return [...groupMocks.availableStudents];
    const response = await fetch(`/api/v1/rooms/${roomId}/groups/available-students`);
    if (!response.ok) throw new Error("Failed to fetch available students");
    return response.json();
  },

  addMember: async (groupId: string, studentId: string): Promise<void> => {
    if (process.env.NODE_ENV !== "test") {
      const studentIndex = groupMocks.availableStudents.findIndex(s => s.id === studentId);
      if (studentIndex > -1) {
        const student = groupMocks.availableStudents.splice(studentIndex, 1)[0];
        const group = groupMocks.groups.find(g => g.id === groupId);
        if (group) group.members.push(student);
      }
      return;
    }
    const response = await fetch(`/api/v1/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to add member");
    }
  },

  removeMember: async (groupId: string, studentId: string): Promise<void> => {
    if (process.env.NODE_ENV !== "test") {
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
    const response = await fetch(`/api/v1/groups/${groupId}/members/${studentId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to remove member");
  },

  fetchMyGroup: async (roomId: string): Promise<Group | null> => {
    if (process.env.NODE_ENV !== "test") return groupMocks.groups[0] || null;
    const response = await fetch(`/api/v1/rooms/${roomId}/groups/me`);
    if (!response.ok) throw new Error("Failed to fetch my group");
    return response.json();
  },
};
