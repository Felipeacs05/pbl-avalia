import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useGroups } from "@/hooks/useGroups";
import { groupService } from "@/services/groupService";
import {
  GROUP_ID,
  makeGroup,
  makeOtherGroup,
  makeOtherStudent,
  makeStudent,
  NOT_ENROLLED_STUDENT_ID,
  OTHER_STUDENT_ID,
  ROOM_ID,
  STUDENT_ID,
} from "../fixtures";

vi.mock("@/services/groupService", () => ({
  groupService: {
    fetchGroups: vi.fn(),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
    fetchAvailableStudents: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    fetchMyGroup: vi.fn(),
  },
}));

const service = vi.mocked(groupService);

async function renderLoadedHook() {
  const hook = renderHook(() => useGroups(ROOM_ID));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe("[US06] useGroups", () => {
  beforeEach(() => {
    service.fetchAvailableStudents.mockResolvedValue([]);
    service.createGroup.mockResolvedValue(undefined);
    service.updateGroup.mockResolvedValue(undefined);
    service.deleteGroup.mockResolvedValue(undefined);
    service.addMember.mockResolvedValue(undefined);
    service.removeMember.mockResolvedValue(undefined);
  });

  it("should load the room's groups and available students on mount", async () => {
    service.fetchGroups.mockResolvedValue([makeGroup()]);
    service.fetchAvailableStudents.mockResolvedValue([makeOtherStudent()]);

    const { result } = renderHook(() => useGroups(ROOM_ID));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.groups).toEqual([makeGroup()]);
    expect(result.current.availableStudents).toEqual([makeOtherStudent()]);
    expect(service.fetchGroups).toHaveBeenCalledWith(ROOM_ID);
    expect(service.fetchAvailableStudents).toHaveBeenCalledWith(ROOM_ID);
  });

  it("createGroup should forward room id and name to the service and show the new group in the list", async () => {
    service.fetchGroups.mockResolvedValueOnce([]).mockResolvedValueOnce([makeGroup({ members: [] })]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.createGroup("Group 1");
    });

    expect(service.createGroup).toHaveBeenCalledTimes(1);
    expect(service.createGroup).toHaveBeenCalledWith(ROOM_ID, "Group 1");
    await waitFor(() => expect(result.current.groups).toEqual([makeGroup({ members: [] })]));
  });

  it("updateGroup should forward id and new name to the service and reflect the new name in the list", async () => {
    service.fetchGroups.mockResolvedValueOnce([makeGroup()]).mockResolvedValueOnce([makeGroup({ name: "Updated Group" })]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.updateGroup(GROUP_ID, "Updated Group");
    });

    expect(service.updateGroup).toHaveBeenCalledTimes(1);
    expect(service.updateGroup).toHaveBeenCalledWith(GROUP_ID, "Updated Group");
    await waitFor(() => expect(result.current.groups[0].name).toBe("Updated Group"));
  });

  it("deleteGroup should forward the id, remove the group and return its members to the available list", async () => {
    service.fetchGroups.mockResolvedValueOnce([makeGroup(), makeOtherGroup()]).mockResolvedValueOnce([makeOtherGroup()]);
    service.fetchAvailableStudents.mockResolvedValueOnce([]).mockResolvedValueOnce([makeStudent()]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.deleteGroup(GROUP_ID);
    });

    expect(service.deleteGroup).toHaveBeenCalledTimes(1);
    expect(service.deleteGroup).toHaveBeenCalledWith(GROUP_ID);
    await waitFor(() => expect(result.current.groups).toEqual([makeOtherGroup()]));
    expect(result.current.availableStudents).toEqual([makeStudent()]);
  });

  it("addMember should forward group and student ids and move the student from available into the group", async () => {
    service.fetchGroups
      .mockResolvedValueOnce([makeGroup()])
      .mockResolvedValueOnce([makeGroup({ members: [makeStudent(), makeOtherStudent()] })]);
    service.fetchAvailableStudents.mockResolvedValueOnce([makeOtherStudent()]).mockResolvedValueOnce([]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.addMember(GROUP_ID, OTHER_STUDENT_ID);
    });

    expect(service.addMember).toHaveBeenCalledTimes(1);
    expect(service.addMember).toHaveBeenCalledWith(GROUP_ID, OTHER_STUDENT_ID);
    await waitFor(() => expect(result.current.groups[0].members).toEqual([makeStudent(), makeOtherStudent()]));
    expect(result.current.availableStudents).toEqual([]);
  });

  it("[QA] addMember should propagate the refusal and keep groups and available students unchanged", async () => {
    service.fetchGroups.mockResolvedValue([makeGroup()]);
    service.fetchAvailableStudents.mockResolvedValue([makeOtherStudent()]);
    service.addMember.mockRejectedValue(new Error("Student is not enrolled in this room."));
    const { result } = await renderLoadedHook();

    await act(async () => {
      await expect(result.current.addMember(GROUP_ID, NOT_ENROLLED_STUDENT_ID)).rejects.toThrow();
    });

    expect(service.addMember).toHaveBeenCalledWith(GROUP_ID, NOT_ENROLLED_STUDENT_ID);
    expect(result.current.groups).toEqual([makeGroup()]);
    expect(result.current.availableStudents).toEqual([makeOtherStudent()]);
  });

  it("removeMember should forward group and student ids and return the student to the available list", async () => {
    service.fetchGroups.mockResolvedValueOnce([makeGroup()]).mockResolvedValueOnce([makeGroup({ members: [] })]);
    service.fetchAvailableStudents.mockResolvedValueOnce([]).mockResolvedValueOnce([makeStudent()]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.removeMember(GROUP_ID, STUDENT_ID);
    });

    expect(service.removeMember).toHaveBeenCalledTimes(1);
    expect(service.removeMember).toHaveBeenCalledWith(GROUP_ID, STUDENT_ID);
    await waitFor(() => expect(result.current.groups[0].members).toEqual([]));
    expect(result.current.availableStudents).toEqual([makeStudent()]);
  });
});
