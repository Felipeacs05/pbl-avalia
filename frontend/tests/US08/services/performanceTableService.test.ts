import { beforeEach, describe, expect, it, vi } from "vitest";
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

const WEIGHTS_ROUTE = new RegExp(`/api/v1/performance-tables/${PERFORMANCE_TABLE_ID}/criteria/weights$`);

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function singleFetchCall() {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init ?? {} };
}

function sentBody(init: RequestInit): unknown {
  return JSON.parse(String(init.body));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("[US08] performanceTableService", () => {
  it("fetchPerformanceTable should GET the table's route and return its criteria with the current weights", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makePerformanceTable(), 200));

    const table = await performanceTableService.fetchPerformanceTable(PERFORMANCE_TABLE_ID);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/performance-tables/${PERFORMANCE_TABLE_ID}$`));
    expect(init.method ?? "GET").toBe("GET");
    expect(table).toEqual(makePerformanceTable());
  });

  it("updateCriteriaWeights should PUT the weights to the table's weights route and return the updated table", async () => {
    const updated = makePerformanceTable({ criteriaList: makeCriteria(0.5, 0.2, 0.3) });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(updated, 200));

    const result = await performanceTableService.updateCriteriaWeights(PERFORMANCE_TABLE_ID, [
      { criterionId: CONTENT_ID, criteriaWeight: 0.5 },
      { criterionId: PARTICIPATION_ID, criteriaWeight: 0.2 },
      { criterionId: SELF_ASSESSMENT_ID, criteriaWeight: 0.3 },
    ]);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(WEIGHTS_ROUTE);
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    // Contrato do backend: pesos em decimal (0–1), cada um ligado ao seu criterionId
    expect(sentBody(init)).toEqual({
      weights: [
        { criterionId: CONTENT_ID, criteriaWeight: 0.5 },
        { criterionId: PARTICIPATION_ID, criteriaWeight: 0.2 },
        { criterionId: SELF_ASSESSMENT_ID, criteriaWeight: 0.3 },
      ],
    });
    expect(result).toEqual(updated);
  });

  it("[QA] updateCriteriaWeights should reject with the 422 status and the backend message when the sum is not 100%", async () => {
    // A regra da soma vive no backend; o cliente só precisa propagar o 422 com a mensagem para a interface
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ status: 422, error: "Unprocessable Content", message: INVALID_SUM_MESSAGE_TEXT }, 422)
    );

    await expect(
      performanceTableService.updateCriteriaWeights(PERFORMANCE_TABLE_ID, [
        { criterionId: CONTENT_ID, criteriaWeight: 0.4 },
        { criterionId: PARTICIPATION_ID, criteriaWeight: 0.3 },
        { criterionId: SELF_ASSESSMENT_ID, criteriaWeight: 0.2 },
      ])
    ).rejects.toMatchObject({ status: 422, message: INVALID_SUM_MESSAGE_TEXT });
    singleFetchCall();
  });
});
