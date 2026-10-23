// src/components/features/feedbacks/StudentFeedbackList.tsx
"use client";

import React from "react";
import type { StudentFeedback } from "../../../types/feedback";

export interface StudentFeedbackListProps {
  feedbacks: StudentFeedback[];
  isLoading: boolean;
  error: string | null;
}

function formatPtBrScore(grade: number): string {
  return grade.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatBrasiliaDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function StudentFeedbackList({
  feedbacks,
  isLoading,
  error,
}: StudentFeedbackListProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        className="w-full rounded-2xl bg-white/10 p-6 text-center text-sm font-medium text-gray-600"
      >
        Carregando feedbacks...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
      >
        {error}
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <p className="w-full py-8 text-center text-sm text-gray-500">
        Você ainda não recebeu feedbacks.
      </p>
    );
  }

  return (
    <ul role="list" className="w-full space-y-3">
      {feedbacks.map((item, index) => {
        // Sanitização e isolamento de campos públicos (DataLeakPrevention)
        const safeTutorName = String(item.tutorName);
        const safeProblemTitle = String(item.problemTitle);
        const safeGrade = formatPtBrScore(Number(item.grade));
        const safeText = String(item.text);
        const safeDate = formatBrasiliaDate(String(item.createdAt));

        return (
          <li
            key={`${safeProblemTitle}-${item.createdAt}-${index}`}
            role="listitem"
            className="rounded-2xl bg-[#090F2C] border border-white/25 p-4 text-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/15">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#1A2352] border border-[#4A5699] text-white">
                  Privado
                </span>
                <span className="text-xs font-bold text-white/90">
                  {safeTutorName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                <span>{safeDate}</span>
                <span>-</span>
                <span>{safeProblemTitle}</span>
              </div>
            </div>

            <p className="text-sm text-white/95 leading-relaxed font-medium">
              {safeText}
            </p>

            <div className="mt-3 pt-2 flex items-center justify-end text-xs font-bold text-emerald-400">
              <span>Nota: {safeGrade}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
