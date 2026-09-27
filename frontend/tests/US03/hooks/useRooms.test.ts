import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useRooms } from "@/hooks/useRooms";
import { roomService } from "@/services/roomService";
import { makeOtherRoom, makeRoom, ROOM_ID } from "../fixtures";

vi.mock("@/services/roomService", () => ({
  roomService: {
    fetchRooms: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
  },
}));

const service = vi.mocked(roomService);

async function renderLoadedHook() {
  const hook = renderHook(() => useRooms());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe("[US03] useRooms", () => {
  beforeEach(() => {
    service.createRoom.mockResolvedValue({ code: "A1B2C", joinLink: "app/join/A1B2C" });
    service.updateRoom.mockResolvedValue(undefined);
    service.deleteRoom.mockResolvedValue(undefined);
  });

  it("should load the user's rooms on mount", async () => {
    service.fetchRooms.mockResolvedValue([makeRoom()]);

    const { result } = renderHook(() => useRooms());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rooms).toEqual([makeRoom()]);
    expect(service.fetchRooms).toHaveBeenCalledTimes(1);
  });

  it("createRoom should forward the name to the service and show the new room in the list", async () => {
    service.fetchRooms.mockResolvedValueOnce([]).mockResolvedValueOnce([makeRoom()]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.createRoom("Software Engineering Module");
    });

    expect(service.createRoom).toHaveBeenCalledTimes(1);
    expect(service.createRoom).toHaveBeenCalledWith("Software Engineering Module");
    await waitFor(() => expect(result.current.rooms).toEqual([makeRoom()]));
  });

  it("updateRoom should forward id and new name to the service and reflect the new name in the list", async () => {
    const updated = makeRoom({ name: "Updated Module" });
    service.fetchRooms.mockResolvedValueOnce([makeRoom()]).mockResolvedValueOnce([updated]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.updateRoom(ROOM_ID, "Updated Module");
    });

    expect(service.updateRoom).toHaveBeenCalledTimes(1);
    expect(service.updateRoom).toHaveBeenCalledWith(ROOM_ID, "Updated Module");
    await waitFor(() => expect(result.current.rooms[0].name).toBe("Updated Module"));
  });

  it("deleteRoom should forward the id to the service and remove the room from the list", async () => {
    service.fetchRooms.mockResolvedValueOnce([makeRoom(), makeOtherRoom()]).mockResolvedValueOnce([makeOtherRoom()]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.deleteRoom(ROOM_ID);
    });

    expect(service.deleteRoom).toHaveBeenCalledTimes(1);
    expect(service.deleteRoom).toHaveBeenCalledWith(ROOM_ID);
    await waitFor(() => expect(result.current.rooms).toEqual([makeOtherRoom()]));
  });
});
