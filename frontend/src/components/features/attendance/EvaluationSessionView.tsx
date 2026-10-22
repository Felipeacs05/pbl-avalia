// src/components/features/attendance/EvaluationSessionView.tsx
"use client";

import React, { useCallback, useState } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { useRooms } from "../../../hooks/useRooms";
import { useSessionRoster } from "../../../hooks/useSessionRoster";
import type { SessionStudent } from "../../../types/attendance";
import { useSessionGrades } from "../../../hooks/useSessionGrades";
import { Toast } from "../../ui/Toast";
import { EvaluationStudentList } from "./EvaluationStudentList";

interface EvaluationSessionViewProps {
  roomId?: string;
  problemId?: string;
  sessionId: string;
  onBack: () => void;
  onEditPreset?: () => void;
  onGenerateReport?: () => void;
  onCloseSession?: () => void;
  onConfigureEvaluation?: (student: SessionStudent) => void;
}

export function EvaluationSessionView({
  roomId,
  sessionId,
  onBack,
  onGenerateReport,
  onCloseSession,
  onConfigureEvaluation,
}: EvaluationSessionViewProps) {
  const { rooms } = useRooms();
  const { roster, dateLabel, isLoading, error } = useSessionRoster(sessionId);
  const { publishedIds, isLoading: isLoadingGrades, isSubmitting, publishGrades, unpublishGrades } =
    useSessionGrades(sessionId);

  // Alunos marcados com o check: são eles que recebem a ação dos botões de publicar/atualizar/despublicar
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (student: SessionStudent) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(student.id)) next.add(student.id);
      return next;
    });

  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const clearToast = useCallback(() => setToast(null), []); // função estável: o Toast reinicia o timer se ela mudar

  // Depois da primeira publicação o botão passa a se chamar "Atualizar notas"
  const hasPublished = publishedIds.size > 0;
  const selectedList = Array.from(selectedIds);
  const canPublish = selectedList.length > 0 && !isSubmitting && !isLoadingGrades;
  const canUnpublish = selectedList.some((id) => publishedIds.has(id)) && !isSubmitting;

  const handlePublish = async () => {
    try {
      await publishGrades(selectedList);
      setToast({
        type: "success",
        message: hasPublished ? "Notas atualizadas para os alunos selecionados." : "Notas publicadas para os alunos selecionados.",
      });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Não foi possível publicar as notas." });
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishGrades(selectedList.filter((id) => publishedIds.has(id)));
      setToast({ type: "success", message: "Notas despublicadas." });
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Não foi possível despublicar as notas." });
    }
  };

  const room = roomId ? rooms.find((r) => r.id === roomId) : null;
  const roomCodeTag = room
    ? `${room.code} - ${room.semester ?? "2026.2"}`
    : "TEC499 - 2026.2";

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col justify-between font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      {/* Top Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-800 cursor-pointer"
          aria-label="Voltar para a sessão"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-5 py-1.5 rounded-full tracking-wide select-none">
          {roomCodeTag}
        </div>

        {/* Espaçador para balancear o cabeçalho */}
        <div className="w-10" aria-hidden="true" />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Title Box: "Avaliar Alunos" */}
        <div className="w-full flex flex-col items-center">
          <div className="w-full max-w-[280px] sm:max-w-xs bg-white border-2 border-[#0099FF] rounded-2xl py-2.5 px-6 shadow-sm text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Avaliar Alunos
            </h1>
          </div>
          <p className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Dia {dateLabel || "24/03"}
          </p>
          <p className="mt-2 text-center text-xs text-gray-500">
            Marque os alunos que receberão as ações de publicar notas.
          </p>
        </div>

        {/* Content: Loading, Error or Student List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 animate-pulse font-medium">
              Carregando alunos para avaliação...
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        ) : roster ? (
          <div className="w-full flex-1">
            <EvaluationStudentList
              students={roster.students}
              onConfigureEvaluation={onConfigureEvaluation}
              selectedIds={selectedIds}
              publishedIds={publishedIds}
              onToggleSelect={toggleSelect}
            />
          </div>
        ) : null}

        {/* Botões de Ação do Rodapé */}
        <div className="w-full pt-4 pb-6 mt-auto flex flex-col gap-3">
          {/* Botão 1: Gerar Relatório da sessão */}
          <button
            type="button"
            onClick={onGenerateReport}
            className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <BarChart3 size={20} className="shrink-0" />
            <span>Gerar Relatório da sessão</span>
          </button>

          {/* Botão 2: Publicar notas (vira "Atualizar notas" depois da 1ª publicação), só para os alunos marcados */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={!canPublish}
            className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {hasPublished ? "Atualizar notas" : "Publicar notas"}
          </button>

          {/* Botão 3: Despublicar notas dos alunos marcados que já estão publicados */}
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={!canUnpublish}
            className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            Despublicar notas
          </button>

          {/* Botão 4: Sair da sessão (só sai da tela) */}
          <button
            type="button"
            onClick={onCloseSession}
            className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all text-center cursor-pointer"
          >
            Sair da sessão
          </button>
        </div>
      </main>
    </div>
  );
}
