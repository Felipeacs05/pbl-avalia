// src/components/features/performance-tables/CriteriaWeightsPage.tsx
"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useCriteriaWeights } from "../../../hooks/useCriteriaWeights";
import { CriteriaWeightsForm } from "./CriteriaWeightsForm";
import { Toast } from "../../ui/Toast"; // ====== ALTERADO POR CLAUDE ======

export interface CriteriaWeightsPageProps {
  performanceTableId: string;
  onBack?: () => void;
}

export function CriteriaWeightsPage({
  performanceTableId,
  onBack,
}: CriteriaWeightsPageProps) {
  // ====== ALTERADO POR CLAUDE ====== (successMessage e clearSuccessMessage)
  const { criteria, isLoading, error, saveWeights, successMessage, clearSuccessMessage } =
    useCriteriaWeights(performanceTableId);

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col font-sans">
      {/* ====== ALTERADO POR CLAUDE ====== (aviso de sucesso ao salvar) */}
      {successMessage && (
        <Toast message={successMessage} type="success" onClose={clearSuccessMessage} />
      )}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-800 cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <h1 className="text-base font-bold text-gray-900">
          Pesos dos Critérios
        </h1>

        <div className="w-10" aria-hidden="true" />
      </header>

      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="w-full bg-white rounded-3xl border border-gray-200/80 shadow-xs py-3.5 px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Pré-set de Avaliação
          </h2>
          <p className="mt-1 text-xs text-gray-500 font-medium">
            Defina o peso de cada critério na nota final. A soma deve ser exatamente 100%.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 animate-pulse font-medium">
              Carregando critérios...
            </p>
          </div>
        ) : (
          <CriteriaWeightsForm
            key={criteria.map((c) => `${c.criterionId}:${c.criteriaWeight}`).join(",")}
            criteria={criteria}
            onSubmit={saveWeights}
            errorMessage={error}
          />
        )}
      </main>
    </div>
  );
}
