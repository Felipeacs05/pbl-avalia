import React, { useState } from "react";
import type { Problem } from "@/types/discipline";

interface EditProblemModalProps {
  problem: Problem;
  onSubmit: (title: string) => Promise<void>;
  onClose: () => void;
}

export function EditProblemModal({ problem, onSubmit, onClose }: EditProblemModalProps) {
  const [title, setTitle] = useState(problem.title);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título do problema não pode ficar vazio.");
      return;
    }
    try {
      await onSubmit(title.trim());
      onClose();
    } catch {
      // handled by caller
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        {error && <div role="alert" className="text-red-500 text-xs mb-3">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-problem-title" className="block text-sm font-medium text-gray-700">
              Título
            </label>
            <input
              id="edit-problem-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-[#4354A0] text-white rounded-lg text-sm font-semibold">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
