import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useProblems } from "@/hooks/useProblems";
import { problemService } from "@/services/problemService";
import { makeOtherProblem, makeProblem, PROBLEM_ID, ROOM_ID } from "../fixtures";

vi.mock("@/services/problemService", () => ({
  problemService: {
    fetchProblems: vi.fn(),
    createProblem: vi.fn(),
    updateProblem: vi.fn(),
    deleteProblem: vi.fn(),
  },
}));

const service = vi.mocked(problemService);

async function renderLoadedHook() {
  const hook = renderHook(() => useProblems(ROOM_ID));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe("[US05] useProblems", () => {
  beforeEach(() => {
    service.deleteProblem.mockResolvedValue(undefined);
  });

  it("should load the room's problems on mount keeping the API order", async () => {
    service.fetchProblems.mockResolvedValue([makeProblem(), makeOtherProblem()]);

    const { result } = renderHook(() => useProblems(ROOM_ID));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.problems).toEqual([makeProblem(), makeOtherProblem()]);
    expect(service.fetchProblems).toHaveBeenCalledTimes(1);
    expect(service.fetchProblems).toHaveBeenCalledWith(ROOM_ID);
  });

  it("createProblem should forward room and title to the service and show the new problem at the end of the list", async () => {
    const created = makeProblem({ id: "777e7777-e77b-77d7-a777-777777777777", title: "Problem 3" });
    service.createProblem.mockResolvedValue(created);
    service.fetchProblems
      .mockResolvedValueOnce([makeProblem(), makeOtherProblem()])
      .mockResolvedValueOnce([makeProblem(), makeOtherProblem(), created]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.createProblem("Problem 3");
    });

    expect(service.createProblem).toHaveBeenCalledTimes(1);
    expect(service.createProblem).toHaveBeenCalledWith(ROOM_ID, "Problem 3");
    // O problema mais novo é o último na cronologia do semestre
    await waitFor(() => expect(result.current.problems).toEqual([makeProblem(), makeOtherProblem(), created]));
  });

  it("updateProblem should forward id and new title to the service and keep the problem's position", async () => {
    const updated = makeProblem({ title: "Problem 1 - Revised" });
    service.updateProblem.mockResolvedValue(updated);
    service.fetchProblems
      .mockResolvedValueOnce([makeProblem(), makeOtherProblem()])
      .mockResolvedValueOnce([updated, makeOtherProblem()]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.updateProblem(PROBLEM_ID, "Problem 1 - Revised");
    });

    expect(service.updateProblem).toHaveBeenCalledTimes(1);
    expect(service.updateProblem).toHaveBeenCalledWith(PROBLEM_ID, "Problem 1 - Revised");
    await waitFor(() => expect(result.current.problems).toEqual([updated, makeOtherProblem()]));
  });

  it("deleteProblem should forward the id to the service and remove the problem from the list", async () => {
    service.fetchProblems
      .mockResolvedValueOnce([makeProblem(), makeOtherProblem()])
      .mockResolvedValueOnce([makeOtherProblem()]);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.deleteProblem(PROBLEM_ID);
    });

    expect(service.deleteProblem).toHaveBeenCalledTimes(1);
    expect(service.deleteProblem).toHaveBeenCalledWith(PROBLEM_ID);
    await waitFor(() => expect(result.current.problems).toEqual([makeOtherProblem()]));
  });

  it("[QA] updateProblem should expose an error and keep the list when the service rejects with 403", async () => {
    service.fetchProblems.mockResolvedValue([makeProblem(), makeOtherProblem()]);
    service.updateProblem.mockRejectedValue({ status: 403 });
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.updateProblem(PROBLEM_ID, "Hijacked Title");
    });

    expect(service.updateProblem).toHaveBeenCalledWith(PROBLEM_ID, "Hijacked Title");
    expect(result.current.error).not.toBeNull();
    expect(result.current.problems).toEqual([makeProblem(), makeOtherProblem()]);
  });
});
