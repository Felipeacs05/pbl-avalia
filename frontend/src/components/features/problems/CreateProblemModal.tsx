"use client";

import React, { useState } from "react";

interface CreateProblemModalProps {
  onSubmit: (title: string) => Promise<void>;
  onClose: () => void;
}

export function CreateProblemModal({ onSubmit, onClose }: CreateProblemModalProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título é obrigatório.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(title.trim());
      onClose();
    } catch {
      setError("Falha ao criar o problema.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-[#182860] mb-4">Criar Problema</h2>

        {error && (
          <div role="alert" className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="create-problem-title" className="block text-sm font-medium text-gray-700 mb-1">
            Título
          </label>
          <input
            id="create-problem-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#2D3A74]"
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-[#2D3A74] hover:bg-[#232e5c] rounded-lg disabled:opacity-50"
              disabled={isSubmitting}
            >
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
