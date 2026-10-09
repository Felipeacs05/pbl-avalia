import React, { useState } from "react";
import { X } from "lucide-react";
import type { Student } from "@/types/group";

interface AddMemberModalProps {
  students: Student[];
  onSubmit: (studentId: string) => Promise<void>;
  onClose: () => void;
}

export function AddMemberModal({ students, onSubmit, onClose }: AddMemberModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedStudentId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(selectedStudentId);
      onClose();
    } catch {
      setError("Não foi possível adicionar o aluno.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="bg-[#4354A0] w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">Adicionar Aluno</h2>
        <p className="text-xs text-white/70 mb-4">
          Selecione um aluno disponível.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-xl text-sm font-semibold"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-2">
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#757DC3] scrollbar-track-transparent">
            {students.map((student) => (
              <label
                key={student.id}
                className="flex items-center space-x-3 p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-colors border border-white/20"
              >
                <input
                  type="radio"
                  name="student"
                  value={student.id}
                  checked={selectedStudentId === student.id}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="h-4 w-4 text-[#757DC3] focus:ring-[#757DC3] bg-white border-transparent"
                  aria-label={student.name}
                />
                <span className="text-sm font-medium">{student.name}</span>
              </label>
            ))}
            {students.length === 0 && (
              <p className="text-sm text-white/50 text-center py-4">
                Nenhum aluno disponível.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!selectedStudentId || isSubmitting}
            className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            aria-label="Adicionar"
          >
            {isSubmitting ? "Adicionando..." : "Adicionar"}
          </button>
        </form>
      </div>
    </div>
  );
}