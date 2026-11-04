// src/components/features/behavior-records/BehaviorRecordsPage.tsx
"use client";

import React, { useState } from "react";
import { useBehaviorRecords } from "../../../hooks/useBehaviorRecords";
import type { BehaviorRecordInput, BehaviorStudent } from "../../../types/behaviorRecord";
import { BehaviorStudentList } from "./BehaviorStudentList";
import { BehaviorRecordPanel } from "./BehaviorRecordPanel";

interface BehaviorRecordsPageProps {
  sessionId: string;
  students: BehaviorStudent[];
}

// Registro rápido de comportamento em 2 toques: aluno -> tag
export function BehaviorRecordsPage({ sessionId, students }: BehaviorRecordsPageProps) {
  const { tags, isSaving, error, registerBehavior, clearError } = useBehaviorRecords(sessionId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const selected = students.find((s) => s.id === selectedId) ?? null;

  const handleSelect = (studentId: string) => {
    clearError();
    setConfirmation(null);
    setSelectedId(studentId);
  };

  const handleRegister = async (input: BehaviorRecordInput): Promise<boolean> => {
    if (!selected) return false;
    const saved = await registerBehavior(selected.id, input);
    if (saved) {
      setConfirmation(
        "tagId" in input
          ? `${tags.find((t) => t.id === input.tagId)?.name ?? "Tag"} registrado para ${selected.name}`
          : `Observação registrada para ${selected.name}`,
      );
      setSelectedId(null);
    }
    return saved;
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {confirmation && (
        <div
          role="status"
          className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
        >
          {confirmation}
        </div>
      )}

      <BehaviorStudentList students={students} onSelectStudent={handleSelect} />

      {selected && (
        <BehaviorRecordPanel
          key={selected.id}
          student={selected}
          tags={tags}
          isSaving={isSaving}
          error={error}
          onRegister={handleRegister}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
