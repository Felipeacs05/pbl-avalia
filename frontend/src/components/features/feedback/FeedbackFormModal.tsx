// src/components/features/feedback/FeedbackFormModal.tsx
"use client";

import React, { useState } from "react";
import { X, User, Users, Send } from "lucide-react";
import type {
  FeedbackPayload,
  FeedbackStudentOption,
  FeedbackTargetType,
} from "../../../types/feedback";

export interface FeedbackFormModalProps {
  problemId: string;
  sessionId?: string;
  students: FeedbackStudentOption[];
  onClose: () => void;
  onSubmit: (payload: FeedbackPayload) => Promise<unknown>;
}

export function FeedbackFormModal({
  problemId,
  sessionId,
  students,
  onClose,
  onSubmit,
}: FeedbackFormModalProps) {
  const [targetType, setTargetType] = useState<FeedbackTargetType>("INDIVIDUAL");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [gradeText, setGradeText] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const isIndividual = targetType === "INDIVIDUAL";
  const isFormInvalid =
    !message.trim() || (isIndividual && !selectedStudentId) || isSubmitting;

  const handleTabSwitch = (type: FeedbackTargetType) => {
    setTargetType(type);
    setError(null);
    if (type === "CLASS") {
      setSelectedStudentId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormInvalid) return;

    setIsSubmitting(true);
    setError(null);

    const parsedGrade =
      gradeText.trim() !== ""
        ? Number(gradeText.trim().replace(",", "."))
        : undefined;

    try {
      await onSubmit({
        problemId,
        sessionId,
        targetType,
        studentId: isIndividual ? selectedStudentId : undefined,
        message: message.trim(),
        grade:
          parsedGrade !== undefined && !Number.isNaN(parsedGrade)
            ? parsedGrade
            : undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao enviar feedback.";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      data-testid="feedback-modal-backdrop"
    >
      <div
        className="bg-[#4354A0] w-full max-w-md rounded-[1.5rem] p-6 text-white shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Fechar"
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <h2 id="feedback-modal-title" className="text-xl font-bold mb-1">
          Enviar Feedback
        </h2>
        <p className="text-xs text-white/75 mb-5">
          Direcione orientações qualitativas para um aluno ou para toda a turma.
        </p>

        {/* Seletor de Abas: Individual vs Toda a Turma */}
        <div
          role="tablist"
          aria-label="Tipo de destinatário do feedback"
          className="grid grid-cols-2 gap-2 bg-[#2E3A70] p-1.5 rounded-xl mb-4"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isIndividual}
            data-testid="tab-individual"
            onClick={() => handleTabSwitch("INDIVIDUAL")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isIndividual
                ? "bg-[#757DC3] text-white shadow-xs"
                : "text-white/70 hover:text-white"
            }`}
          >
            <User size={15} />
            <span>Individual</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={!isIndividual}
            data-testid="tab-class"
            onClick={() => handleTabSwitch("CLASS")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !isIndividual
                ? "bg-[#757DC3] text-white shadow-xs"
                : "text-white/70 hover:text-white"
            }`}
          >
            <Users size={15} />
            <span>Toda a Turma</span>
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 bg-red-500/20 border border-red-400 text-red-100 p-3 rounded-xl text-xs font-semibold"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isIndividual && (
            <div>
              <label
                htmlFor="student-select"
                className="block text-xs font-semibold mb-1.5"
              >
                Aluno destinatário
              </label>
              <select
                id="student-select"
                data-testid="student-select"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3]"
                required
              >
                <option value="">Selecione um aluno...</option>
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="feedback-grade"
              className="block text-xs font-semibold mb-1.5"
            >
              Nota do Feedback (opcional)
            </label>
            <input
              id="feedback-grade"
              type="text"
              inputMode="decimal"
              data-testid="feedback-grade"
              value={gradeText}
              onChange={(e) => setGradeText(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ex: 8.5"
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#757DC3]"
            />
          </div>

          <div>
            <label
              htmlFor="feedback-textarea"
              className="block text-xs font-semibold mb-1.5"
            >
              Mensagem de Feedback
            </label>
            <textarea
              id="feedback-textarea"
              data-testid="feedback-textarea"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                isIndividual
                  ? "Escreva o feedback privado para o aluno selecionado..."
                  : "Escreva o feedback geral para toda a turma..."
              }
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3] resize-none"
              required
            />
          </div>

          <button
            type="submit"
            data-testid="submit-feedback-btn"
            disabled={isFormInvalid}
            className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send size={16} />
            <span>{isSubmitting ? "Enviando..." : "Enviar Feedback"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
