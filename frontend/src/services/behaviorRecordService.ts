// src/services/behaviorRecordService.ts
import type { BehaviorRecord, BehaviorRecordInput, BehaviorTag } from "../types/behaviorRecord";
import { behaviorRecordMock } from "../mocks/behaviorRecord.mock";
import { USE_REAL_API } from "./apiMode";

const FORBIDDEN_MSG = "Apenas o tutor responsável pela sala pode registrar comportamentos.";
const DEFAULT_ERROR_MSG = "Não foi possível registrar o comportamento. Tente novamente.";
const MOCK_DELAY_MS = 250;

interface ErrorBody {
  message?: string;
  errors?: Record<string, string>;
}

async function readErrorBody(response: Response): Promise<ErrorBody | null> {
  try {
    return (await response.json()) as ErrorBody;
  } catch {
    return null; // o 403 do backend vem em texto puro
  }
}

async function throwHttpError(response: Response): Promise<never> {
  if (response.status === 403) {
    throw { status: 403, message: FORBIDDEN_MSG };
  }
  const body = await readErrorBody(response);
  const fieldMessage = body?.errors ? Object.values(body.errors)[0] : undefined;
  throw { status: response.status, message: fieldMessage ?? body?.message ?? DEFAULT_ERROR_MSG };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const behaviorRecordService = {
  async fetchBehaviorTags(): Promise<BehaviorTag[]> {
    if (!USE_REAL_API) {
      await wait(MOCK_DELAY_MS);
      return behaviorRecordMock.getTags();
    }

    const response = await fetch("/api/v1/behavior-tags");
    if (!response.ok) await throwHttpError(response);
    return (await response.json()) as BehaviorTag[];
  },

  async createBehaviorRecord(
    sessionId: string,
    studentId: string,
    input: BehaviorRecordInput,
  ): Promise<BehaviorRecord> {
    if (!USE_REAL_API) {
      await wait(MOCK_DELAY_MS);
      return behaviorRecordMock.createRecord(sessionId, studentId, input);
    }

    const response = await fetch(`/api/v1/sessions/${sessionId}/students/${studentId}/behavior-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) await throwHttpError(response);
    return (await response.json()) as BehaviorRecord;
  },
};
