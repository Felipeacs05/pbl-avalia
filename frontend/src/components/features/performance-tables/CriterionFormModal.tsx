// src/components/features/performance-tables/CriterionFormModal.tsx

// Modal para adicionar ou editar um critério do Pré-set (US07).
// Mesmo visual do modal "Tags de Observação". Se receber "criterion", abre em modo edição.
"use client";

import React, { useEffect, useState } from "react";
import { X, ListChecks } from "lucide-react";
import type { PresetCriterion } from "../../../types/performanceTable";
import type { CriterionInput } from "../../../hooks/useCriteriaPreset";

const MIN_WEIGHT = 1;
const MAX_WEIGHT = 10;

// Subtarefa: bloqueia nome vazio ou só com espaços.
// Também bloqueia nome repetido, para não existirem dois critérios iguais na tabela.
export function validateCriterionName(name: string, otherNames: string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "O nome do critério não pode ficar vazio.";
  if (otherNames.some((other) => other.trim().toLowerCase() === trimmed.toLowerCase())) {
    return "Já existe um critério com esse nome.";
  }
  return null;
}

interface CriterionFormModalProps {
  isOpen: boolean;
  criterion?: PresetCriterion | null; // preenchido = edição; vazio = novo critério
  existingNames: string[];            // nomes dos OUTROS critérios, para checar repetição
  onClose: () => void;
  onSubmit: (input: CriterionInput) => void;
}

export function CriterionFormModal({ isOpen, criterion, existingNames, onClose, onSubmit }: CriterionFormModalProps) {
  const isEditing = Boolean(criterion);
  const [name, setName] = useState(criterion?.name ?? "");
  // Peso guardado como texto: assim dá para apagar o campo e digitar outro número
  const [weightText, setWeightText] = useState(String(criterion?.weight ?? MIN_WEIGHT));
  const [error, setError] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);

  // Fecha com Esc, como os outros modais
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // O form também cobre o Enter no campo de nome
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateCriterionName(name, existingNames);
    const weight = Number(weightText);
    const isWeightValid = Number.isInteger(weight) && weight >= MIN_WEIGHT && weight <= MAX_WEIGHT;
    setError(validationError);
    setWeightError(isWeightValid ? null : `O peso deve ser um número inteiro de ${MIN_WEIGHT} a ${MAX_WEIGHT}.`);
    if (validationError || !isWeightValid) return; // não envia nada
    onSubmit({ name: name.trim(), weight });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="criterion-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        noValidate // a validação é nossa, para mostrar a mensagem em português
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-gray-800 flex flex-col gap-4"
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="Fechar modal"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center shrink-0">
            <ListChecks size={22} />
          </div>
          <div>
            <h2 id="criterion-form-title" className="text-xl font-bold text-gray-900 leading-tight">
              {isEditing ? "Editar Critério" : "Adicionar Critério"}
            </h2>
            <p className="text-xs text-gray-500 font-medium">Critério usado na Tabela de Desempenho</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="criterion-name" className="text-sm font-semibold text-gray-700">
            Nome do critério
          </label>
          <input
            id="criterion-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null); // limpa o erro assim que o professor volta a digitar
            }}
            placeholder="Ex.: Pesquisa"
            maxLength={60}
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "criterion-name-error" : undefined}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 ${
              error ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-[#4354A0]"
            }`}
          />
          {error && (
            <p id="criterion-name-error" role="alert" className="text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="criterion-weight" className="text-sm font-semibold text-gray-700">
              Peso
            </label>
            <input
              id="criterion-weight"
              type="number"
              inputMode="numeric"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={1}
              value={weightText}
              onChange={(e) => {
                setWeightText(e.target.value);
                if (weightError) setWeightError(null);
              }}
              aria-invalid={Boolean(weightError)}
              aria-describedby={weightError ? "criterion-weight-error" : undefined}
              className={`w-20 px-3 py-2 text-center rounded-xl border font-bold text-sm text-gray-800 focus:outline-none focus:ring-2 ${
                weightError ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-[#4354A0]"
              }`}
            />
          </div>
          {/* A validação do peso fica no envio (handleSubmit) */}
          {weightError && (
            <p id="criterion-weight-error" role="alert" className="text-xs font-semibold text-red-600">
              {weightError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="py-3 rounded-2xl bg-[#4354A0] hover:bg-[#384890] text-white font-bold text-sm transition-colors"
          >
            {isEditing ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </div>
  );
}
