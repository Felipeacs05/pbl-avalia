import { beforeEach, describe, expect, it, vi } from "vitest";
import { problemService } from "@/services/problemService";
import { makeOtherProblem, makeProblem, PROBLEM_ID, ROOM_ID } from "../fixtures";

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

describe("[US05] problemService", () => {
  it("fetchProblems should GET the room's problems route and keep the order sent by the API", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([makeProblem(), makeOtherProblem()], 200));

    const problems = await problemService.fetchProblems(ROOM_ID);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/problems$`));
    expect(init.method ?? "GET").toBe("GET");
    // O backend já ordena por createdAt: o cliente não pode reordenar
    expect(problems).toEqual([makeProblem(), makeOtherProblem()]);
  });

  it("createProblem should POST only the title to the room's problems route and return the created problem", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makeProblem(), 201));

    const created = await problemService.createProblem(ROOM_ID, "Problem 1");

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/problems$`));
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ title: "Problem 1" });
    expect(created).toEqual(makeProblem());
  });

  it("updateProblem should PUT the new title to the problem's route and return the updated problem", async () => {
    const updated = makeProblem({ title: "Problem 1 - Revised" });
    vi.mocked(fetch).mockResolvedValue(jsonResponse(updated, 200));

    await expect(problemService.updateProblem(PROBLEM_ID, "Problem 1 - Revised")).resolves.toEqual(updated);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/problems/${PROBLEM_ID}$`));
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ title: "Problem 1 - Revised" });
  });

  it("deleteProblem should DELETE the problem's route and resolve on 204", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(problemService.deleteProblem(PROBLEM_ID)).resolves.toBeUndefined();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/problems/${PROBLEM_ID}$`));
    expect(init.method).toBe("DELETE");
  });

  it("[QA] updateProblem should reject with the 403 status when the user is not the room Tutor", async () => {
    // A regra de posse vive no backend; o cliente só precisa propagar o 403
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));

    await expect(problemService.updateProblem(PROBLEM_ID, "Hijacked Title")).rejects.toMatchObject({ status: 403 });
    singleFetchCall();
  });
});
