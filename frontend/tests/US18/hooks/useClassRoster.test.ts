import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useClassRoster } from "@/hooks/useClassRoster";
import { classRosterService } from "@/services/classRosterService";
import { makeRosterStudent, makeStudentWithoutPhoto, ROOM_ID } from "../fixtures";

vi.mock("@/services/classRosterService", () => ({
  classRosterService: { fetchClassRoster: vi.fn() },
}));

const service = vi.mocked(classRosterService);

describe("[US18] useClassRoster", () => {
  it("Deve carregar na montagem os alunos da sala informada, mantendo a ordem e os campos do backend", async () => {
    const students = [makeRosterStudent(), makeStudentWithoutPhoto()];
    service.fetchClassRoster.mockResolvedValue(students);

    const { result } = renderHook(() => useClassRoster(ROOM_ID));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(service.fetchClassRoster).toHaveBeenCalledTimes(1);
    expect(service.fetchClassRoster).toHaveBeenCalledWith(ROOM_ID);
    expect(result.current.students).toEqual(students);
  });
});
