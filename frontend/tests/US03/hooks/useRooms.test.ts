import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useRooms } from "@/hooks/useRooms";
import { roomService } from "@/services/roomService";
import { makeOtherRoom, makeRoom } from "../fixtures";

vi.mock("@/services/roomService", () => ({
  roomService: {
    fetchRooms: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
  },
}));

const mockService = vi.mocked(roomService);

describe("[US03] useRooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Deve carregar as salas no mount e desativar o isLoading", async () => {
    const initialRooms = [makeRoom(), makeOtherRoom()];
    mockService.fetchRooms.mockResolvedValueOnce(initialRooms);

    const { result } = renderHook(() => useRooms());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.rooms).toEqual(initialRooms);
    expect(mockService.fetchRooms).toHaveBeenCalledTimes(1);
  });

  it("Deve criar uma nova sala, adicionar à lista local e disparar createRoom no service", async () => {
    mockService.fetchRooms.mockResolvedValueOnce([makeRoom()]);
    mockService.createRoom.mockResolvedValueOnce({
      code: "NEW123",
      joinLink: "app/join/NEW123",
    });

    const { result } = renderHook(() => useRooms());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createRoom("Compiladores");
    });

    expect(mockService.createRoom).toHaveBeenCalledWith("Compiladores");
    expect(result.current.rooms.some((r) => r.name === "Compiladores")).toBe(true);
  });

  it("Deve atualizar o nome de uma sala existente e refletir a alteração no estado", async () => {
    const originalRoom = makeRoom({ id: "room-1", name: "Nome Antigo" });
    mockService.fetchRooms.mockResolvedValueOnce([originalRoom]);
    mockService.updateRoom.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRooms());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateRoom("room-1", "Nome Atualizado");
    });

    expect(mockService.updateRoom).toHaveBeenCalledWith("room-1", "Nome Atualizado");
    expect(result.current.rooms.find((r) => r.id === "room-1")?.name).toBe("Nome Atualizado");
  });

  it("Deve excluir uma sala da lista após a chamada de deleteRoom", async () => {
    const room1 = makeRoom({ id: "room-1" });
    const room2 = makeOtherRoom({ id: "room-2" });
    mockService.fetchRooms.mockResolvedValueOnce([room1, room2]);
    mockService.deleteRoom.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRooms());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteRoom("room-1");
    });

    expect(mockService.deleteRoom).toHaveBeenCalledWith("room-1");
    expect(result.current.rooms.some((r) => r.id === "room-1")).toBe(false);
    expect(result.current.rooms).toHaveLength(1);
  });
});
