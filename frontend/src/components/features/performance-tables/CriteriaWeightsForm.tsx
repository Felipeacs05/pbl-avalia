// src/components/features/performance-tables/CriteriaWeightsForm.tsx
"use client";

import React, { useState } from "react";
import type { Criterion, CriterionWeight } from "../../../types/performanceTable";

export interface CriteriaWeightsFormProps {
  criteria: Criterion[];
  onSubmit: (weights: CriterionWeight[]) => Promise<void>;
  errorMessage?: string | null;
}

export function CriteriaWeightsForm({
  criteria,
  onSubmit,
  errorMessage,
}: CriteriaWeightsFormProps) {
  // pesos guardados como texto: dá para apagar o campo e digitar outro número
  const buildMap = (list: Criterion[]) => {
    const map: Record<string, string> = {};
    list.forEach((c) => {
      map[c.criterionId] = String(Math.round(c.criteriaWeight * 100));
    });
    return map;
  };

  // Guarda os pesos em percentual inteiro (ex: "40" para 0.40)
  const [weightsMap, setWeightsMap] = useState<Record<string, string>>(() =>
    buildMap(criteria)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWeightChange = (criterionId: string, val: string) => {
    setWeightsMap((prev) => ({ ...prev, [criterionId]: val }));
  };

  // cada peso precisa ser inteiro de 0 a 100; campo vazio conta como inválido
  const isValidWeight = (val: string) => {
    const n = Number(val);
    return val.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 100;
  };
  const allValid = criteria.every((c) => isValidWeight(weightsMap[c.criterionId] ?? ""));
  const totalSum = criteria.reduce((acc, c) => acc + (Number(weightsMap[c.criterionId]) || 0), 0);
  const is100 = totalSum === 100;
  // Soma diferente de 100% também é enviada: quem recusa (422) é o back-end
  const canSubmit = allValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return; // proteção extra, ex.: Enter no campo
    setIsSubmitting(true);
    try {
      const payload: CriterionWeight[] = criteria.map((c) => ({
        criterionId: c.criterionId,
        // Converte de volta para decimal (0.0 - 1.0) para o backend
        criteriaWeight: Number(weightsMap[c.criterionId] ?? 0) / 100, // texto -> número
      }));
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
      {errorMessage && (
        <div
          role="alert"
          className="w-full p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {criteria.map((criterion) => {
          const inputId = `criterion-${criterion.criterionId}`;
          const currentVal = weightsMap[criterion.criterionId] ?? "";
          const isInvalid = !isValidWeight(currentVal);

          return (
            <div
              key={criterion.criterionId}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between shadow-xs"
            >
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={inputId}
                  className="block text-sm font-bold text-gray-900 cursor-pointer"
                >
                  {criterion.criteriaName}
                </label>
                {criterion.criteriaDescription && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {criterion.criteriaDescription}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  id={inputId}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  inputMode="numeric"
                  value={currentVal}
                  onChange={(e) =>
                    handleWeightChange(criterion.criterionId, e.target.value)
                  }
                  aria-invalid={isInvalid}
                  className={`w-20 px-3 py-2 text-center rounded-xl border font-bold text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#757DC3] ${
                    isInvalid ? "border-red-400" : "border-gray-300"
                  }`}
                  aria-label={criterion.criteriaName}
                />
                <span className="text-sm font-bold text-gray-500">%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between shadow-xs">
        <span className="text-sm font-bold text-gray-700">Soma Total:</span>
        <span
          role="status"
          className={`font-bold text-base transition-colors ${
            is100 ? "text-green-600" : "text-red-600"
          }`}
        >
          {totalSum}%
        </span>
      </div>

      {/* peso inválido desativa o botão; soma diferente de 100% só avisa */}
      {(!allValid || !is100) && (
        <p className="text-xs text-center text-gray-500 font-medium">
          {!allValid
            ? "Cada peso deve ser um número inteiro de 0 a 100."
            : "A soma dos pesos deve ser 100%. Se não for, o servidor recusa o envio."}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !canSubmit}
        className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
      >
        <span>{isSubmitting ? "Salvando..." : "Salvar Pesos"}</span>
      </button>
    </form>
  );
}
