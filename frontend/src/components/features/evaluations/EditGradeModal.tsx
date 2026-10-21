// src/components/features/evaluations/EditGradeModal.tsx
"use client";

import React, { useState, useEffect, useId } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Avatar } from "../../ui/Avatar";
import { formatReviewScore } from "./EvaluationReviewList";
import type {
  GradeAdjustmentInput,
  StudentSelfEvaluationReview,
} from "../../../types/gradeAdjustment";

export interface EditGradeModalProps {
  isOpen: boolean;
  student: StudentSelfEvaluationReview | null;
  roomCodeTag?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (assessmentId: string, input: GradeAdjustmentInput) => Promise<boolean | void>;
}

interface EditGradeModalContentProps {
  student: StudentSelfEvaluationReview;
  roomCodeTag: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (assessmentId: string, input: GradeAdjustmentInput) => Promise<boolean | void>;
}

function EditGradeModalContent({
  student,
  roomCodeTag,
  isSubmitting,
  error,
  onClose,
  onSave,
}: EditGradeModalContentProps) {
  const uid = useId();
  const titleId = `edit-grade-title-${uid}`;
  const gradeInputId = `edit-grade-input-${uid}`;
  const justificationId = `edit-justification-${uid}`;

  const [gradeText, setGradeText] = useState<string>(() =>
    student.score !== null ? formatReviewScore(student.score) : ""
  );
  const [justification, setJustification] = useState<string>(
    () => student.justification ?? ""
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  const normalizedNumber = Number(gradeText.trim().replace(",", "."));
  const isValidNumber =
    gradeText.trim() !== "" &&
    !Number.isNaN(normalizedNumber) &&
    normalizedNumber >= 0 &&
    normalizedNumber <= 10;

  const currentScore = student.score ?? student.nota_original ?? 0;
  const isGradeChanged = isValidNumber && normalizedNumber !== currentScore;
  const hasJustification = justification.trim().length > 0;
  const canSave = isValidNumber && isGradeChanged && hasJustification && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValidNumber) {
      setLocalError("A nota ajustada deve estar entre 0 e 10.");
      return;
    }
    if (!isGradeChanged) {
      setLocalError("Altere o valor da nota para realizar o ajuste.");
      return;
    }
    if (!hasJustification) {
      setLocalError("Justificativa é obrigatória");
      return;
    }

    setLocalError(null);
    await onSave(student.id, {
      adjustedGrade: normalizedNumber,
      justification: justification.trim(),
    });
  };

  const displayError = localError ?? error;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="edit-grade-modal"
      className="fixed inset-0 z-50 bg-[#F5F5F7] flex flex-col justify-between overflow-y-auto font-sans"
    >
      {/* Top Header idêntico ao protótipo */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-10 px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Voltar para a lista de revisão"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-800 cursor-pointer"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-6 py-1.5 rounded-full tracking-wide select-none border border-[#9BA7D6]">
          {roomCodeTag}
        </div>

        <div className="w-10" aria-hidden="true" />
      </header>

      {/* Main Content */}
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex-1 w-full max-w-md mx-auto px-5 py-6 flex flex-col gap-6"
      >
        {/* Título em cápsula branca "Revisão de notas" */}
        <div className="w-full flex justify-center">
          <div className="w-full max-w-[300px] bg-white border border-gray-200 rounded-full py-3 px-8 shadow-xs text-center">
            <h2
              id={titleId}
              className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight"
            >
              Revisão de notas
            </h2>
          </div>
        </div>

        {/* Barra do aluno com input de nota editável à direita (conforme print 3) */}
        <div className="w-full rounded-full bg-gradient-to-r from-[#313B72] to-[#4354A0] border-[3px] border-[#6473BC] p-2 pr-3 text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              src={student.avatarUrl}
              name={student.studentName}
              sizeClassName="w-11 h-11 sm:w-12 sm:h-12"
            />
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm sm:text-base truncate">
                {student.studentName}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <label htmlFor={gradeInputId} className="sr-only">
              Nota ajustada
            </label>
            <input
              id={gradeInputId}
              type="text"
              inputMode="decimal"
              aria-label="Nota ajustada"
              data-testid="modal-grade-input"
              value={gradeText}
              onChange={(e) => {
                setGradeText(e.target.value);
                if (localError) setLocalError(null);
              }}
              disabled={isSubmitting}
              className="w-[82px] py-1.5 px-3 rounded-full bg-[#364385] border-2 border-[#7585CC] text-center font-bold text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
            />
          </div>
        </div>

        {/* Campo obrigatório: Justificativa da mudança */}
        <div className="w-full flex flex-col gap-3 mt-1">
          <label
            htmlFor={justificationId}
            className="text-xl sm:text-2xl font-bold text-gray-900 text-center tracking-tight"
          >
            Justificativa da mudança
          </label>

          <textarea
            id={justificationId}
            aria-label="Justificativa da mudança"
            data-testid="modal-justification-input"
            rows={6}
            value={justification}
            onChange={(e) => {
              setJustification(e.target.value);
              if (localError) setLocalError(null);
            }}
            disabled={isSubmitting}
            placeholder="Descreva obrigatoriamente o motivo pedagógico para a alteração da nota..."
            className="w-full rounded-[1.5rem] border border-gray-300 bg-white p-4 text-sm sm:text-base text-gray-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#4354A0] resize-none min-h-[175px]"
          />

          {!isGradeChanged && isValidNumber && (
            <p className="text-xs text-gray-500 text-center">
              Clique na nota acima para alterá-la e preencha a justificativa para habilitar o salvamento.
            </p>
          )}
          {isGradeChanged && !hasJustification && (
            <p className="text-xs text-amber-700 font-medium text-center">
              * A justificativa da mudança é obrigatória quando a nota é alterada.
            </p>
          )}
          {!isValidNumber && gradeText.trim() !== "" && (
            <p role="alert" className="text-xs text-red-600 font-semibold text-center">
              Informe uma nota válida entre 0 e 10.
            </p>
          )}
        </div>

        {displayError && (
          <div
            role="alert"
            className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm font-semibold text-red-700 text-center"
          >
            {displayError}
          </div>
        )}

        {/* Botão Inferior "+ Salvar Nota" */}
        <div className="w-full pt-4 pb-4 mt-auto">
          <button
            type="submit"
            disabled={!canSave}
            aria-label="Salvar Nota"
            data-testid="save-adjusted-grade-btn"
            className="w-full bg-[#757DC3] hover:bg-[#636BAE] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
            <span>{isSubmitting ? "Salvando..." : "Salvar Nota"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function EditGradeModal({
  isOpen,
  student,
  roomCodeTag = "TEC499 - 2026.2",
  isSubmitting = false,
  error = null,
  onClose,
  onSave,
}: EditGradeModalProps) {
  if (!isOpen || !student) return null;

  return (
    <EditGradeModalContent
      key={`${student.id}-${student.score}`}
      student={student}
      roomCodeTag={roomCodeTag}
      isSubmitting={isSubmitting}
      error={error}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
