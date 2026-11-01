import { beforeEach, describe, expect, it, vi } from "vitest";
import { behaviorRecordService } from "@/services/behaviorRecordService";
import {
  FORBIDDEN_MESSAGE,
  FORBIDDEN_TEXT,
  FREE_TEXT,
  makeOtherTag,
  makeRecord,
  makeTag,
  makeTextRecord,
  SESSION_ID,
  STUDENT_ID,
  TAG_ID,
} from "../fixtures";

const RECORDS_ROUTE = new RegExp(`/api/v1/sessions/${SESSION_ID}/students/${STUDENT_ID}/behavior-records$`);

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

describe("[US11] behaviorRecordService", () => {
  it("Deve buscar as tags predefinidas com GET e devolvê-las na ordem do backend", async () => {
    const tags = [makeTag(), makeOtherTag()];
    vi.mocked(fetch).mockResolvedValue(jsonResponse(tags, 200));

    await expect(behaviorRecordService.fetchBehaviorTags()).resolves.toEqual(tags);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(/\/api\/v1\/behavior-tags$/);
    expect(init.method ?? "GET").toBe("GET");
  });

  it("Deve fazer POST só do id da tag na rota do aluno na sessão e devolver o registro do servidor", async () => {
    const saved = makeRecord();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(saved, 201));

    await expect(behaviorRecordService.createBehaviorRecord(SESSION_ID, STUDENT_ID, { tagId: TAG_ID }))
      .resolves.toEqual(saved);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(RECORDS_ROUTE);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    // O horário e os nomes são do servidor: o corpo leva só a tag
    expect(sentBody(init)).toEqual({ tagId: TAG_ID });
  });

  it("Deve fazer POST só do texto livre na rota do aluno na sessão e devolver o registro do servidor", async () => {
    const saved = makeTextRecord();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(saved, 201));

    await expect(behaviorRecordService.createBehaviorRecord(SESSION_ID, STUDENT_ID, { text: FREE_TEXT }))
      .resolves.toEqual(saved);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(RECORDS_ROUTE);
    expect(init.method).toBe("POST");
    expect(sentBody(init)).toEqual({ text: FREE_TEXT });
  });

  it("Deve rejeitar com o status e a mensagem em texto puro quando o backend recusa com 403", async () => {
    // O 403 do GlobalExceptionHandler não é JSON
    vi.mocked(fetch).mockResolvedValue(
      new Response(FORBIDDEN_TEXT, {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    await expect(behaviorRecordService.createBehaviorRecord(SESSION_ID, STUDENT_ID, { tagId: TAG_ID }))
      .rejects.toEqual({ status: 403, message: expect.stringMatching(FORBIDDEN_MESSAGE) });
    singleFetchCall();
  });
});
