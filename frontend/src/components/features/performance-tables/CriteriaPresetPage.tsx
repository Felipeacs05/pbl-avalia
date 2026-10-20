// src/components/features/performance-tables/CriteriaPresetPage.tsx

// Tela "Pre-set de Critérios" (US07)
// Lista interativa (SPA): adicionar, editar e remover critérios atualiza a tela na hora,
// sem recarregar a página. As mudanças só vão para o back-end em "Salvar Pre-set".
"use client";

import React, { useState } from "react";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { useRooms } from "../../../hooks/useRooms";
import { useCriteriaPreset } from "../../../hooks/useCriteriaPreset";
import type { PresetCriterion } from "../../../types/performanceTable";
import { Toast } from "../../ui/Toast";
import { PresetCriterionCard } from "./PresetCriterionCard";
import { CriterionFormModal } from "./CriterionFormModal";

interface CriteriaPresetPageProps {
  roomId: string;                    // usado no selo do cabeçalho (ex.: "TEC499 - 2026.2")
  presetId?: string;                 // de quem é o pré-set; sem ele, usa o da sala
  onBack?: () => void;
  onSaved?: () => void;              // chamado depois de salvar com sucesso (ex.: ir para o problema)
  allowSaveWithoutChanges?: boolean; // true na criação do problema: dá para aceitar o pré-set padrão sem mexer
}

// Controla o modal: fechado, adicionando um novo ou editando um existente
type ModalState = { mode: "closed" } | { mode: "add" } | { mode: "edit"; criterion: PresetCriterion };

export function CriteriaPresetPage({
  roomId,
  presetId = roomId,
  onBack,
  onSaved,
  allowSaveWithoutChanges = false,
}: CriteriaPresetPageProps) {
  const { rooms } = useRooms();
  const {
    criteria,
    isLoading,
    isSaving,
    hasChanges,
    toast,
    clearToast,
    addCriterion,
    updateCriterion,
    removeCriterion,
    savePreset,
  } = useCriteriaPreset(presetId);

  const [modal, setModal] = useState<ModalState>({ mode: "closed" });

  const canSave = (hasChanges || allowSaveWithoutChanges) && !isSaving;

  const handleSave = async () => {
    const ok = await savePreset();
    if (ok) onSaved?.();
  };

  // Mesmo selo de sala das outras telas (ex.: "TEC499 - 2026.2")
  const room = rooms.find((r) => r.id === roomId);
  const roomCodeTag = room ? `${room.code} - ${room.semester ?? "2026.2"}` : "TEC499 - 2026.2";

  const requiredCriteria = criteria.filter((c) => !c.isOptional);
  const optionalCriteria = criteria.filter((c) => c.isOptional);

  // Nomes dos outros critérios, para o modal bloquear nome repetido
  const editingId = modal.mode === "edit" ? modal.criterion.id : null;
  const otherNames = criteria.filter((c) => c.id !== editingId).map((c) => c.name);

  const renderCard = (criterion: PresetCriterion) => (
    <li key={criterion.id}>
      <PresetCriterionCard
        criterion={criterion}
        onEdit={() => setModal({ mode: "edit", criterion })}
        onRemove={() => removeCriterion(criterion.id)}
      />
    </li>
  );

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

      {/* Cabeçalho igual ao das telas de sessão */}
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
          <div className="w-10" aria-hidden="true" />
        )}
        <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-5 py-1.5 rounded-full tracking-wide select-none">
          {roomCodeTag}
        </div>
        <div className="w-10" aria-hidden="true" />
      </header>

      <main className="flex-1 w-full max-w-md md:max-w-xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        <div className="w-full bg-white rounded-3xl border border-gray-200/80 shadow-xs py-3.5 px-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Pre-set de Critérios</h1>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 animate-pulse font-medium">Carregando critérios...</p>
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-2.5" aria-labelledby="required-criteria-title">
              <h2 id="required-criteria-title" className="text-xs font-bold text-gray-500 tracking-wider uppercase px-1">
                Critérios
              </h2>
              {requiredCriteria.length === 0 ? (
                <p className="text-xs italic text-gray-400 px-1">Nenhum critério obrigatório.</p>
              ) : (
                <ul className="flex flex-col gap-2.5 list-none p-0">{requiredCriteria.map(renderCard)}</ul>
              )}
            </section>

            <section className="flex flex-col gap-2.5" aria-labelledby="optional-criteria-title">
              <h2 id="optional-criteria-title" className="text-xs font-bold text-gray-500 tracking-wider uppercase px-1">
                Critérios opcionais
              </h2>
              {optionalCriteria.length === 0 ? (
                <p className="text-xs italic text-gray-400 px-1">Nenhum critério opcional.</p>
              ) : (
                <ul className="flex flex-col gap-2.5 list-none p-0">{optionalCriteria.map(renderCard)}</ul>
              )}

              <button
                type="button"
                onClick={() => setModal({ mode: "add" })}
                className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-2.5 px-6 rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={18} />
                <span>Adicionar Critério</span>
              </button>
            </section>

            <div className="w-full pt-6 pb-6 mt-auto flex flex-col gap-2">
              {hasChanges && (
                <p className="text-xs text-center text-gray-500">Há alterações não salvas.</p>
              )}
              {/* Na edição comum, só ativa quando algo mudou. Na criação do problema, já vem ativo
                  para o professor poder aceitar o pré-set padrão. */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                <span>{isSaving ? "Salvando..." : "Salvar Pre-set"}</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* key: remonta o modal a cada abertura, para começar com os dados do critério certo */}
      {modal.mode !== "closed" && (
        <CriterionFormModal
          key={modal.mode === "edit" ? modal.criterion.id : "new"}
          isOpen
          criterion={modal.mode === "edit" ? modal.criterion : null}
          existingNames={otherNames}
          onClose={() => setModal({ mode: "closed" })}
          onSubmit={(input) =>
            modal.mode === "edit" ? updateCriterion(modal.criterion.id, input) : addCriterion(input)
          }
        />
      )}
    </div>
  );
}
