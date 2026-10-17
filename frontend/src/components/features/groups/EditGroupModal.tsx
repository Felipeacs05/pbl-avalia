import React, { useState } from "react";
import { X } from "lucide-react";
import type { Group } from "@/types/group";

interface EditGroupModalProps {
  group: Group;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

export function EditGroupModal({ group, onSubmit, onClose }: EditGroupModalProps) {
  const [name, setName] = useState(group.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmedName);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : "Erro ao atualizar grupo. Tente novamente.");
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

        <h2 className="text-xl font-bold mb-1">Editar Grupo</h2>
        <p className="text-xs text-white/70 mb-4">
          Altere o nome do grupo selecionado.
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
          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="groupNameEdit" className="block text-sm font-semibold">
                Nome do grupo
              </label>
              <span
                className={`text-xs font-medium ${
                  name.length > 50 ? "text-red-400" : "text-white/50"
                }`}
              >
                {name.length}/50
              </span>
            </div>
            <input
              id="groupNameEdit"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ex: Grupo 1"
              maxLength={50}
              className={`w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition-all ${
                name.length > 50 ? "ring-2 ring-red-400" : "focus:ring-[#757DC3]"
              }`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            aria-label="Salvar"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}