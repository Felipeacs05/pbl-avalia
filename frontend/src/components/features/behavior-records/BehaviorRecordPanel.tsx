// src/components/features/behavior-records/BehaviorRecordPanel.tsx
"use client";

import React, { useId, useState } from "react";
import { X } from "lucide-react";
import type { BehaviorRecordInput, BehaviorStudent, BehaviorTag } from "../../../types/behaviorRecord";

// Mesmo limite do backend (@Size(max = 500))
export const BEHAVIOR_TEXT_LIMIT = 500;
const TEXT_TOO_LONG_MESSAGE = `O texto deve ter no máximo ${BEHAVIOR_TEXT_LIMIT} caracteres.`;

interface BehaviorRecordPanelProps {
  student: BehaviorStudent;
  tags: BehaviorTag[];
  isSaving: boolean;
  error: string | null;
  /** Resolve true quando o registro foi salvo. */
  onRegister: (input: BehaviorRecordInput) => Promise<boolean>;
  onClose?: () => void;
}

// 2º toque do registro rápido: a tag predefinida (sem confirmação intermediária)
export function BehaviorRecordPanel({
  student,
  tags,
  isSaving,
  error,
  onRegister,
  onClose,
}: BehaviorRecordPanelProps) {
  const titleId = useId();
  const textId = useId();
  const [text, setText] = useState("");

  const isTooLong = text.length > BEHAVIOR_TEXT_LIMIT;
  const canSaveText = text.trim() !== "" && !isTooLong && !isSaving;
  const alertMessage = isTooLong ? TEXT_TOO_LONG_MESSAGE : error;

  const handleSaveText = () => {
    if (!canSaveText) return;
    void onRegister({ text: text.trim() });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl relative text-gray-800">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 min-h-11 min-w-11 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        )}

        <h2 id={titleId} className="text-xl font-bold text-gray-900 pr-10">
          {student.name}
        </h2>
        <p className="text-xs text-gray-500 mt-1 mb-4">Toque em uma tag para registrar o comportamento.</p>

        <div className="flex flex-wrap gap-2 mb-5">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              disabled={isSaving}
              onClick={() => void onRegister({ tagId: tag.id })}
              className="min-h-11 min-w-11 px-4 rounded-full border border-[#4354A0] text-[#2E3A70] text-sm font-semibold hover:bg-[#EEEDF8] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tag.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <div className="flex items-center justify-between">
            <label htmlFor={textId} className="text-sm font-semibold text-gray-700">
              Observação
            </label>
            <span
              role="status"
              className={`text-xs font-semibold ${isTooLong ? "text-red-600" : "text-gray-400"}`}
            >
              {text.length}/{BEHAVIOR_TEXT_LIMIT}
            </span>
          </div>
          <textarea
            id={textId}
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSaving}
            aria-invalid={isTooLong}
            placeholder="Escreva uma observação sobre o comportamento..."
            className={`w-full rounded-xl border p-3 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 disabled:opacity-60 ${
              isTooLong ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-[#4354A0]"
            }`}
          />
        </div>

        {alertMessage && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            {alertMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveText}
          disabled={!canSaveText}
          className="w-full min-h-11 min-w-11 rounded-xl bg-[#4354A0] hover:bg-[#354382] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Salvar observação
        </button>
      </div>
    </div>
  );
}
