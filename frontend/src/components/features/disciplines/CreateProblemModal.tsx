// src/components/features/disciplines/CreateProblemModal.tsx

// Modal "Criar Problema" (e "Editar Problema", quando recebe `problem`)
// Não chama a API sozinho: avisa a página pelo onSubmit, e a página cria/salva e navega.
// Na edição, também dá acesso ao Pré-set de Critérios do problema.
"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const TITLE_MAX_LENGTH = 100;

interface CreateProblemModalProps {
  problem?: { title: string; description?: string }; // quando existe, o modal está editando este problema
  onClose: () => void;
  onSubmit: (input: { title: string; description: string }) => Promise<void>;
  onEditPreset?: () => void; // só na edição: abre o Pré-set de Critérios
}

export function CreateProblemModal({ problem, onClose, onSubmit, onEditPreset }: CreateProblemModalProps) {
  const isEditing = Boolean(problem);
  const [title, setTitle] = useState(problem?.title ?? "");
  const [description, setDescription] = useState(problem?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fecha com Esc (menos durante o envio, para não perder o problema no meio da criação)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Título vazio ou só com espaços não salva o problema
    if (!title.trim()) {
      setError("O título do problema não pode ficar vazio.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // Quem fecha o modal é a página (navegando para o Pré-set na criação, ou fechando na edição)
      await onSubmit({ title: title.trim(), description: description.trim() });
    } catch {
      setError(`Não foi possível ${isEditing ? "salvar" : "criar"} o problema. Tente novamente.`);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-problem-title"
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-[#4354A0] w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Fechar modal"
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <h2 id="create-problem-title" className="text-xl font-bold mb-1">
          {isEditing ? "Editar Problema" : "Criar Problema"}
        </h2>
        <p className="text-xs text-white/70 mb-4">
          {isEditing
            ? "Altere o nome do problema ou o pré-set de critérios."
            : "O problema nasce com o preset de critérios, que você ajusta na Tabela de Desempenho."}
        </p>

        {error && (
          <div role="alert" className="mb-4 bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="problem-title" className="block text-sm font-semibold mb-1">
              Título
            </label>
            <input
              id="problem-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              disabled={isSubmitting}
              maxLength={TITLE_MAX_LENGTH}
              placeholder="Problema 1"
              autoFocus
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3]"
            />
          </div>

          <div>
            <label htmlFor="problem-description" className="block text-sm font-semibold mb-1">
              Descrição
            </label>
            <textarea
              id="problem-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Descreva a situação-problema"
              rows={3}
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3] resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (isEditing ? "Salvando..." : "Criando...") : isEditing ? "Salvar" : "Criar"}
        </button>

        {isEditing && onEditPreset && (
          <button
            type="button"
            onClick={onEditPreset}
            disabled={isSubmitting}
            className="w-full mt-3 border border-white/40 hover:bg-white/10 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            Editar pré-set de critérios
          </button>
        )}
      </form>
    </div>
  );
}
