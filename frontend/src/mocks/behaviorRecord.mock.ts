// src/mocks/behaviorRecord.mock.ts
import type { BehaviorRecord, BehaviorRecordInput, BehaviorTag } from "../types/behaviorRecord";

const TAGS: BehaviorTag[] = [
  { id: "tag_atraso", name: "Atraso" },
  { id: "tag_celular", name: "Celular fora de contexto" },
  { id: "tag_participacao", name: "Participação ativa" },
  { id: "tag_interrupcao", name: "Interrupção" },
  { id: "tag_colaboracao", name: "Colaboração" },
];

let nextId = 1;

export const behaviorRecordMock = {
  getTags(): BehaviorTag[] {
    return TAGS.map((tag) => ({ ...tag }));
  },

  // O nome do aluno é preenchido pela tela (o mock não tem a lista de alunos)
  createRecord(sessionId: string, studentId: string, input: BehaviorRecordInput): BehaviorRecord {
    const tag = "tagId" in input ? TAGS.find((t) => t.id === input.tagId) : undefined;
    return {
      id: `behavior_${nextId++}`,
      sessionId,
      studentId,
      studentName: "",
      tagId: tag?.id ?? null,
      tagName: tag?.name ?? null,
      text: "text" in input ? input.text : null,
      recordedAt: new Date().toISOString(),
    };
  },
};
