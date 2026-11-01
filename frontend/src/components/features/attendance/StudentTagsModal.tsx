// src/components/features/attendance/StudentTagsModal.tsx
"use client";

import React, { useState } from "react";
import { X, MapPin, Plus, Tag as TagIcon } from "lucide-react";

interface StudentTagsModalProps {
  isOpen: boolean;
  studentName: string;
  initialTags?: string[];
  onClose: () => void;
  onSaveTags: (tags: string[]) => void;
}

const DEFAULT_SUGGESTIONS = [
  "Participativo",
  "Boa argumentação",
  "Pontual",
  "Dúvida em conceito",
  "Liderança colaborativa",
  "Comunicação clara",
] as const;

export function StudentTagsModal({
  isOpen,
  studentName,
  initialTags = [],
  onClose,
  onSaveTags,
}: StudentTagsModalProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setTags([...tags, trimmed]);
    }
    setInputValue("");
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const handleSave = () => {
    onSaveTags(tags);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-tags-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-gray-800">
        <button
          onClick={onClose}
          type="button"
          aria-label="Fechar modal de tags"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center shrink-0">
            <MapPin size={22} />
          </div>
          <div>
            <h2 id="student-tags-title" className="text-xl font-bold text-gray-900 leading-tight">
              Tags de Observação
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Anotações formativas para <strong className="text-gray-700">{studentName}</strong>
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4 mt-2">
          Insira marcadores pedagógicos para registrar o comportamento e desempenho nesta sessão:
        </p>

        {/* Input para nova tag */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <TagIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digitar nova tag..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4354A0]"
            />
          </div>
          <button
            type="button"
            onClick={() => handleAddTag(inputValue)}
            className="py-2.5 px-3.5 bg-[#4354A0] hover:bg-[#354382] text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Adicionar</span>
          </button>
        </div>

        {/* Tags Atuais do Aluno */}
        <div className="mb-4">
          <span className="text-xs font-semibold text-gray-600 mb-2 block">
            Tags aplicadas ({tags.length}):
          </span>
          {tags.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">
              Nenhuma tag adicionada ainda.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-[#EEEDF8] text-[#2E3A70] text-xs font-semibold px-3 py-1.5 rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    aria-label={`Remover tag ${tag}`}
                    className="hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sugestões Rápidas */}
        <div className="mb-6 pt-3 border-t border-gray-100">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Sugestões rápidas:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_SUGGESTIONS.map((suggestion) => {
              const alreadyHas = tags.some((t) => t.toLowerCase() === suggestion.toLowerCase());
              return (
                <button
                  key={suggestion}
                  type="button"
                  disabled={alreadyHas}
                  onClick={() => handleAddTag(suggestion)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    alreadyHas
                      ? "border-gray-200 text-gray-400 bg-gray-50 opacity-60 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:border-[#4354A0] hover:bg-[#EEEDF8]/40"
                  }`}
                >
                  +{suggestion}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm transition-colors cursor-pointer text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-xl bg-[#4354A0] hover:bg-[#354382] text-white font-semibold text-sm shadow-sm transition-colors cursor-pointer text-center"
          >
            Salvar Tags
          </button>
        </div>
      </div>
    </div>
  );
}
