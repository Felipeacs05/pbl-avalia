import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMyGroup } from "@/hooks/useMyGroup";
import { groupService } from "@/services/groupService";
import { makeGroup, makeOtherStudent, makeStudent, ROOM_ID } from "../fixtures";

vi.mock("@/services/groupService", () => ({
  groupService: {
    fetchMyGroup: vi.fn(),
  },
}));

const service = vi.mocked(groupService);

describe("[US06] useMyGroup", () => {
  it("should load the logged student's group with all its members on mount", async () => {
    const myGroup = makeGroup({ members: [makeStudent(), makeOtherStudent()] });
    service.fetchMyGroup.mockResolvedValue(myGroup);

    const { result } = renderHook(() => useMyGroup(ROOM_ID));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.group).toEqual(myGroup);
    expect(service.fetchMyGroup).toHaveBeenCalledTimes(1);
    expect(service.fetchMyGroup).toHaveBeenCalledWith(ROOM_ID);
  });
});
