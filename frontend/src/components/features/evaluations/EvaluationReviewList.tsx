// src/components/features/evaluations/EvaluationReviewList.tsx
"use client";

import React from "react";
import { SquarePen, AlertCircle } from "lucide-react";
import { Avatar } from "../../ui/Avatar";
import type { StudentSelfEvaluationReview } from "../../../types/gradeAdjustment";

export interface EvaluationReviewListProps {
  reviews: StudentSelfEvaluationReview[];
  onEditStudent: (student: StudentSelfEvaluationReview) => void;
}

export function formatReviewScore(score: number | null): string {
  if (score === null || Number.isNaN(score)) return "—";
  return Number.isInteger(score)
    ? String(score)
    : score.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
}

export function EvaluationReviewList({
  reviews,
  onEditStudent,
}: EvaluationReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="w-full rounded-[1.5rem] bg-white p-8 text-center shadow-xs border border-gray-200">
        <p className="text-sm text-gray-500">
          Nenhum aluno encontrado para revisão nesta sessão.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="w-full flex flex-col gap-3.5"
      aria-label="Lista de autoavaliações dos alunos"
      data-testid="evaluation-review-list"
    >
      {reviews.map((student) => {
        const isPending = student.status === "pending" || student.score === null;
        const isModified = Boolean(
          student.ajustado_por_tutor || student.modifiedByTutor
        );

        const cardTone = isPending
          ? "bg-[#5A607A] border-[#7B829E] opacity-65 text-white/90"
          : "bg-gradient-to-r from-[#313B72] to-[#4354A0] border-[#6473BC] text-white";

        return (
          <li
            key={student.id}
            data-testid={`review-row-${student.studentId}`}
            className={`w-full rounded-full border-[3px] p-1.5 pr-2.5 sm:p-2 sm:pr-3.5 flex items-center gap-2.5 sm:gap-3.5 shadow-md transition-all ${cardTone}`}
          >
            <Avatar
              src={student.avatarUrl}
              name={student.studentName}
              sizeClassName="w-11 h-11 sm:w-12 sm:h-12"
              dimmed={isPending}
            />

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm sm:text-base font-semibold tracking-tight">
                {student.studentName}
              </p>

              {isPending ? (
                <p className="truncate text-[11px] text-white/75 mt-0.5">
                  Autoavaliação ainda não enviada
                </p>
              ) : isModified ? (
                <div className="flex items-center gap-1 mt-0.5 text-[11px] font-semibold text-amber-200">
                  <AlertCircle size={12} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Nota Modificada pelo Tutor
                    {student.nota_original !== null
                      ? ` (Orig.: ${formatReviewScore(student.nota_original)})`
                      : ""}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Botão de Edição (Lápis) */}
            <button
              type="button"
              onClick={() => !isPending && onEditStudent(student)}
              disabled={isPending}
              aria-label={`Editar nota de ${student.studentName}`}
              title={
                isPending
                  ? "Aluno ainda não enviou a autoavaliação"
                  : `Editar nota de ${student.studentName}`
              }
              data-testid={`edit-grade-button-${student.studentId}`}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:hover:bg-white/15 disabled:cursor-not-allowed"
            >
              <SquarePen size={18} aria-hidden="true" />
            </button>

            {/* Cápsula de Nota ou Tag Pendente */}
            {isPending ? (
              <div
                data-testid={`pending-badge-${student.studentId}`}
                className="min-w-[82px] sm:min-w-[92px] py-1.5 px-3 rounded-full bg-black/25 border-2 border-white/25 text-center font-semibold text-white/90 text-xs tracking-wide select-none"
              >
                Pendente
              </div>
            ) : (
              <div
                data-testid={`score-badge-${student.studentId}`}
                className="min-w-[72px] sm:min-w-[82px] py-1.5 px-4 rounded-full bg-[#364385] border-2 border-[#7585CC] text-center font-bold text-white text-sm sm:text-base shadow-inner select-none"
              >
                {formatReviewScore(student.score)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
