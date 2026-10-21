// src/components/features/feedback/StudentFeedbacksModal.tsx
"use client";

import React from "react";
import { X } from "lucide-react";
import type { FeedbackItem } from "../../../types/feedback";

export interface StudentFeedbacksModalProps {
  feedbacks: FeedbackItem[];
  onClose: () => void;
}

export function StudentFeedbacksModal({
  feedbacks,
  onClose,
}: StudentFeedbacksModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="student-feedbacks-backdrop"
    >
      <div
        className="bg-[#1B2559] w-full max-w-md rounded-[2rem] p-5 text-white shadow-2xl relative max-h-[85vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-feedbacks-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho escuro conforme Figma */}
        <div className="bg-[#0B1131] rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <h2 id="student-feedbacks-title" className="text-lg font-bold">
              Meus Feedbacks
            </h2>
            <p className="text-xs text-white/70">
              Mensagens recebidas do tutor
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-white/80 hover:text-white p-1.5 transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* Lista de Feedbacks (Geral e Privado) */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {feedbacks.map((item) => {
            const isClass = item.targetType === "CLASS";
            const hasGradeAdjustment =
              typeof item.previousGrade === "number" &&
              typeof item.newGrade === "number";
            const isGradeIncreased =
              hasGradeAdjustment &&
              (item.newGrade ?? 0) >= (item.previousGrade ?? 0);

            return (
              <article
                key={item.id}
                data-testid={`feedback-item-${item.id}`}
                className={`rounded-2xl p-4 border transition-all ${
                  isClass
                    ? "bg-[#3B498B] border-white/15"
                    : "bg-[#090F2C] border-white/25"
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/15">
                  <span
                    className={`text-xs font-semibold px-4 py-1 rounded-full border ${
                      isClass
                        ? "bg-[#6C78B8] border-white/20 text-white"
                        : "bg-[#1A2352] border-[#4A5699] text-white"
                    }`}
                  >
                    {isClass ? "Geral" : "Privado"}
                  </span>

                  <span className="text-xs font-semibold text-white/80">
                    {item.dateLabel}
                  </span>
                </div>

                <p className="text-sm text-white/95 leading-relaxed font-medium">
                  {item.message}
                </p>

                {hasGradeAdjustment && (
                  <div
                    className="mt-3 pt-2 text-center text-sm font-bold tracking-wide"
                    aria-label="Nota Modificada pelo Tutor"
                  >
                    <span
                      className={
                        isGradeIncreased ? "text-red-400" : "text-emerald-400"
                      }
                    >
                      {item.previousGrade?.toFixed(1)}
                    </span>
                    <span className="mx-1.5 text-white/70">→</span>
                    <span
                      className={
                        isGradeIncreased ? "text-emerald-400" : "text-red-400"
                      }
                    >
                      {item.newGrade?.toFixed(1)}
                    </span>
                  </div>
                )}
              </article>
            );
          })}

          {feedbacks.length === 0 && (
            <div className="text-center py-10 text-sm text-white/60">
              Nenhum feedback registrado até o momento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
