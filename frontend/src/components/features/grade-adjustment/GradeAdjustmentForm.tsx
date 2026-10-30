// src/components/features/grade-adjustment/GradeAdjustmentForm.tsx
"use client";

import React, { useState, useId } from "react";
import { Plus } from "lucide-react";
import { Avatar } from "../../ui/Avatar";
import { SelfAssessmentGrade } from "./SelfAssessmentGrade";
import type {
  GradeAdjustmentInput,
  SubmittedSelfAssessment,
} from "../../../types/gradeAdjustment";

export interface GradeAdjustmentFormProps {
  assessment: SubmittedSelfAssessment;
  error?: string | null;
  isSubmitting?: boolean;
  onSubmit: (input: GradeAdjustmentInput) => Promise<void> | void;
}

export function GradeAdjustmentForm({
  assessment,
  error = null,
  isSubmitting = false,
  onSubmit,
}: GradeAdjustmentFormProps) {
  const uid = useId();
  const gradeInputId = `adjusted-grade-${uid}`;
  const justificationInputId = `justification-${uid}`;

  const [gradeValue, setGradeValue] = useState<string>(String(assessment.score));
  const [justification, setJustification] = useState<string>(
    assessment.justification ?? ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const isModified = Boolean(
    assessment.modifiedByTutor ?? assessment.ajustado_por_tutor
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedJustification = justification.trim();
    if (!trimmedJustification) {
      setValidationError("Justificativa é obrigatória");
      return;
    }

    const normalizedGrade = Number(String(gradeValue).replace(",", "."));
    if (
      String(gradeValue).trim() === "" ||
      Number.isNaN(normalizedGrade) ||
      normalizedGrade < 0 ||
      normalizedGrade > 10
    ) {
      setValidationError("A nota ajustada deve estar entre 0 e 10");
      return;
    }

    setValidationError(null);
    await onSubmit({
      adjustedGrade: normalizedGrade,
      justification: trimmedJustification,
    });
  };

  const activeAlert = validationError ?? error;

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="w-full flex flex-col gap-5"
      data-testid="grade-adjustment-form"
    >
      {/* Card superior do aluno no padrão visual azul/índigo do Avalia */}
      <div className="w-full rounded-[2rem] bg-gradient-to-r from-[#313B72] to-[#4354A0] border-[3px] border-[#6473BC] p-3 sm:p-4 text-white shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={assessment.avatarUrl}
              name={assessment.studentName}
              sizeClassName="w-11 h-11 sm:w-12 sm:h-12"
            />
            <div className="min-w-0">
              <p className="font-bold text-white text-sm sm:text-base truncate">
                {assessment.studentName}
              </p>
              {assessment.comment && (
                <p className="text-xs text-white/80 line-clamp-2 mt-0.5">
                  {assessment.comment}
                </p>
              )}
            </div>
          </div>

          <SelfAssessmentGrade
            score={assessment.score}
            modifiedByTutor={isModified}
            ajustado_por_tutor={isModified}
            justification={assessment.justification}
          />
        </div>
      </div>

      {/* Campo de Nota Ajustada */}
      <div className="w-full flex flex-col gap-1.5">
        <label
          htmlFor={gradeInputId}
          className="text-sm font-bold text-gray-800 tracking-tight"
        >
          Nota ajustada
        </label>
        <input
          id={gradeInputId}
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={gradeValue}
          onChange={(e) => {
            setGradeValue(e.target.value);
            if (validationError) setValidationError(null);
          }}
          disabled={isSubmitting}
          placeholder="0,0 a 10,0"
          className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4354A0] disabled:opacity-60"
        />
      </div>

      {/* Campo de Justificativa da Mudança */}
      <div className="w-full flex flex-col gap-2">
        <label
          htmlFor={justificationInputId}
          className="text-base sm:text-lg font-bold text-gray-900 text-center"
        >
          Justificativa da mudança
        </label>
        <textarea
          id={justificationInputId}
          rows={5}
          value={justification}
          onChange={(e) => {
            setJustification(e.target.value);
            if (validationError) setValidationError(null);
          }}
          disabled={isSubmitting}
          placeholder="Descreva o motivo pedagógico para o ajuste da nota de autoavaliação..."
          className="w-full rounded-[1.5rem] border border-gray-300 bg-white p-4 text-sm sm:text-base text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4354A0] resize-none disabled:opacity-60"
        />
      </div>

      {/* Alerta de Validação ou Erro da API */}
      {activeAlert && (
        <div
          role="alert"
          className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 text-center"
        >
          {activeAlert}
        </div>
      )}

      {/* Botão de submissão */}
      <button
        type="submit"
        disabled={isSubmitting}
        aria-label="Salvar ajuste"
        className="w-full bg-[#757DC3] hover:bg-[#636BAE] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
        <span>Salvar ajuste</span>
      </button>
    </form>
  );
}
