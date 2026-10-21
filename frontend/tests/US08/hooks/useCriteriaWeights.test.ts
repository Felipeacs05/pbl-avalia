import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCriteriaWeights } from "@/hooks/useCriteriaWeights";
import { performanceTableService } from "@/services/performanceTableService";
import {
  CONTENT_ID,
  INVALID_SUM_MESSAGE_TEXT,
  makeCriteria,
  makePerformanceTable,
  PARTICIPATION_ID,
  PERFORMANCE_TABLE_ID,
  SELF_ASSESSMENT_ID,
} from "../fixtures";

vi.mock("@/services/performanceTableService", () => ({
  performanceTableService: {
    fetchPerformanceTable: vi.fn(),
    updateCriteriaWeights: vi.fn(),
  },
}));

const service = vi.mocked(performanceTableService);

const weightsOf = (content: number, participation: number, selfAssessment: number) => [
  { criterionId: CONTENT_ID, criteriaWeight: content },
  { criterionId: PARTICIPATION_ID, criteriaWeight: participation },
  { criterionId: SELF_ASSESSMENT_ID, criteriaWeight: selfAssessment },
];

async function renderLoadedHook() {
  const hook = renderHook(() => useCriteriaWeights(PERFORMANCE_TABLE_ID));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe("[US08] useCriteriaWeights", () => {
  it("should load the table's criteria with their current weights on mount", async () => {
    service.fetchPerformanceTable.mockResolvedValue(makePerformanceTable());

    const { result } = renderHook(() => useCriteriaWeights(PERFORMANCE_TABLE_ID));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.criteria).toEqual(makeCriteria());
    expect(service.fetchPerformanceTable).toHaveBeenCalledTimes(1);
    expect(service.fetchPerformanceTable).toHaveBeenCalledWith(PERFORMANCE_TABLE_ID);
  });

  it("saveWeights should forward the table id and weights to the service and show the weights saved by the backend", async () => {
    const updated = makePerformanceTable({ criteriaList: makeCriteria(0.5, 0.2, 0.3) });
    service.updateCriteriaWeights.mockResolvedValue(updated);
    service.fetchPerformanceTable.mockResolvedValueOnce(makePerformanceTable()).mockResolvedValueOnce(updated);
    const { result } = await renderLoadedHook();

    await act(async () => {
      await result.current.saveWeights(weightsOf(0.5, 0.2, 0.3));
    });

    expect(service.updateCriteriaWeights).toHaveBeenCalledTimes(1);
    expect(service.updateCriteriaWeights).toHaveBeenCalledWith(PERFORMANCE_TABLE_ID, weightsOf(0.5, 0.2, 0.3));
    await waitFor(() => expect(result.current.criteria).toEqual(updated.criteriaList));
    expect(result.current.error).toBeNull();
  });

  it("[QA] should expose the 422 message keeping the saved weights, and clear it once a 100% formula is saved", async () => {
    const updated = makePerformanceTable({ criteriaList: makeCriteria(0.5, 0.2, 0.3) });
    service.fetchPerformanceTable.mockResolvedValueOnce(makePerformanceTable()).mockResolvedValueOnce(updated);
    service.updateCriteriaWeights
      .mockRejectedValueOnce({ status: 422, message: INVALID_SUM_MESSAGE_TEXT })
      .mockResolvedValueOnce(updated);
    const { result } = await renderLoadedHook();

    // 90%: o backend recusa e nada muda do lado do cliente
    await act(async () => {
      await result.current.saveWeights(weightsOf(0.4, 0.3, 0.2));
    });

    expect(service.updateCriteriaWeights).toHaveBeenCalledWith(PERFORMANCE_TABLE_ID, weightsOf(0.4, 0.3, 0.2));
    expect(result.current.error).toBe(INVALID_SUM_MESSAGE_TEXT);
    expect(result.current.criteria).toEqual(makeCriteria());

    // 100%: o salvamento passa e o erro anterior some
    await act(async () => {
      await result.current.saveWeights(weightsOf(0.5, 0.2, 0.3));
    });

    await waitFor(() => expect(result.current.criteria).toEqual(updated.criteriaList));
    expect(result.current.error).toBeNull();
  });
});
