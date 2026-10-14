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
  const buildMap = (list: Criterion[]) => {
    const map: Record<string, number> = {};
    list.forEach((c) => {
      map[c.criterionId] = Math.round(c.criteriaWeight * 100);
    });
    return map;
  };

  // Guarda os pesos em percentual inteiro (ex: 40 para 0.40)
  const [weightsMap, setWeightsMap] = useState<Record<string, number>>(() =>
    buildMap(criteria)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWeightChange = (criterionId: string, val: string) => {
    const parsed = val === "" ? 0 : Number(val);
    setWeightsMap((prev) => ({
      ...prev,
      [criterionId]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const totalSum = Object.values(weightsMap).reduce((acc, curr) => acc + curr, 0);
  const is100 = totalSum === 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: CriterionWeight[] = criteria.map((c) => ({
        criterionId: c.criterionId,
        // Converte de volta para decimal (0.0 - 1.0) para o backend
        criteriaWeight: (weightsMap[c.criterionId] ?? 0) / 100,
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
          const currentVal = weightsMap[criterion.criterionId] ?? 0;

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
                  value={currentVal}
                  onChange={(e) =>
                    handleWeightChange(criterion.criterionId, e.target.value)
                  }
                  className="w-20 px-3 py-2 text-center rounded-xl border border-gray-300 font-bold text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#757DC3]"
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
      >
        <span>{isSubmitting ? "Salvando..." : "Salvar Pesos"}</span>
      </button>
    </form>
  );
}
