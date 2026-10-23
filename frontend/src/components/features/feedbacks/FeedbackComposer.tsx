// src/components/features/feedbacks/FeedbackComposer.tsx
"use client";

import React, { useState, useId } from "react";
import { Send, User, Users } from "lucide-react";
import type { Feedback, FeedbackInput, FeedbackStudent } from "../../../types/feedback";

export interface FeedbackComposerProps {
  students: FeedbackStudent[];
  isSending: boolean;
  error: string | null;
  sentFeedbacks: Feedback[];
  onSendToStudent: (studentId: string, input: FeedbackInput) => Promise<unknown>;
  onSendToClass: (input: FeedbackInput) => Promise<unknown>;
}

function parseGradeValue(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") {
    return null;
  }
  const num = Number(trimmed);
  return Number.isNaN(num) ? null : num;
}

export function FeedbackComposer({
  students,
  isSending,
  error,
  sentFeedbacks,
  onSendToStudent,
  onSendToClass,
}: FeedbackComposerProps) {
  const uid = useId();
  const studentSelectId = `feedback-student-select-${uid}`;
  const gradeInputId = `feedback-grade-input-${uid}`;
  const textInputId = `feedback-text-input-${uid}`;

  const [activeMode, setActiveMode] = useState<"INDIVIDUAL" | "CLASS">("INDIVIDUAL");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => students[0]?.id ?? ""
  );
  const [gradeText, setGradeText] = useState<string>("");
  const [text, setText] = useState<string>("");

  const effectiveStudentId = selectedStudentId || students[0]?.id || "";

  const buildInput = (): FeedbackInput => ({
    grade: parseGradeValue(gradeText),
    text,
  });

  const handleSendStudent = async () => {
    if (isSending) return;
    await onSendToStudent(effectiveStudentId, buildInput());
  };

  const handleSendClass = async () => {
    if (isSending) return;
    await onSendToClass(buildInput());
  };

  const count = sentFeedbacks.length;
  const confirmationText =
    count === 1
      ? "Feedback enviado para 1 aluno"
      : `Feedback enviado para ${count} alunos`;

  return (
    <section
      className="w-full bg-white rounded-[1.5rem] border border-gray-200 p-6 shadow-sm flex flex-col gap-5"
    >
      {/* Abas visuais de modo (Individual vs Toda a Turma) */}
      <div
        role="tablist"
        aria-label="Modo de envio"
        className="grid grid-cols-2 gap-2 bg-[#EEF0FA] p-1.5 rounded-xl"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "INDIVIDUAL"}
          data-testid="tab-individual"
          onClick={() => setActiveMode("INDIVIDUAL")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMode === "INDIVIDUAL"
              ? "bg-[#4354A0] text-white shadow-xs"
              : "text-[#2E3A70] hover:bg-white/60"
          }`}
        >
          <User size={15} aria-hidden="true" />
          <span>Individual</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeMode === "CLASS"}
          data-testid="tab-class"
          onClick={() => setActiveMode("CLASS")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeMode === "CLASS"
              ? "bg-[#4354A0] text-white shadow-xs"
              : "text-[#2E3A70] hover:bg-white/60"
          }`}
        >
          <Users size={15} aria-hidden="true" />
          <span>Toda a Turma</span>
        </button>
      </div>

      {/* Seletor de Aluno */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={studentSelectId}
          className="text-xs sm:text-sm font-semibold text-gray-800"
        >
          Aluno
        </label>
        <select
          id={studentSelectId}
          data-testid="student-select"
          value={effectiveStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          disabled={isSending}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4354A0] disabled:opacity-50"
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </div>

      {/* Campo de Nota */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={gradeInputId}
          className="text-xs sm:text-sm font-semibold text-gray-800"
        >
          Nota
        </label>
        <input
          id={gradeInputId}
          type="text"
          inputMode="decimal"
          data-testid="feedback-grade-input"
          value={gradeText}
          onChange={(e) => setGradeText(e.target.value)}
          disabled={isSending}
          placeholder="Ex: 8.5"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4354A0] disabled:opacity-50"
        />
      </div>

      {/* Campo de Texto do Feedback */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={textInputId}
          className="text-xs sm:text-sm font-semibold text-gray-800"
        >
          Feedback
        </label>
        <textarea
          id={textInputId}
          rows={4}
          data-testid="feedback-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSending}
          placeholder="Redija o feedback qualitativo sobre o desempenho..."
          className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4354A0] resize-none disabled:opacity-50"
        />
      </div>

      {/* Alerta de erro do backend/validação */}
      {error && (
        <div
          role="alert"
          className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      {/* Confirmação de envio */}
      {!error && count > 0 && (
        <div
          role="status"
          className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-800"
        >
          {confirmationText}
        </div>
      )}

      {/* Botões de disparo Individual e Em Lote (Toda a Turma) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleSendStudent}
          disabled={isSending}
          data-testid="submit-student-feedback-btn"
          className="w-full bg-[#4354A0] hover:bg-[#364485] text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={15} aria-hidden="true" />
          <span>Enviar para o aluno</span>
        </button>

        <button
          type="button"
          onClick={handleSendClass}
          disabled={isSending}
          data-testid="submit-class-feedback-btn"
          className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Users size={16} aria-hidden="true" />
          <span>Enviar para a turma</span>
        </button>
      </div>
    </section>
  );
}
