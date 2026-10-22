// src/components/features/attendance/EvaluationSessionView.tsx
"use client";

import React, { useCallback, useState } from "react";
import { ArrowLeft, BarChart3, Lock } from "lucide-react";
import { useRooms } from "../../../hooks/useRooms";
import { useSessionRoster } from "../../../hooks/useSessionRoster";
import type { SessionStudent } from "../../../types/attendance";
import { useSessionGrades } from "../../../hooks/useSessionGrades";
import { ConfirmModal } from "../../ui/ConfirmModal";
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
  const { isClosed, isLoading: isLoadingGrades, closeGrades } = useSessionGrades(sessionId);

  // Fechar notas pede confirmação: depois de enviadas, não podem mais ser alteradas
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const clearToast = useCallback(() => setToastMessage(null), []); // função estável: o Toast reinicia o timer se ela mudar

  const handleConfirmCloseGrades = async () => {
    await closeGrades(); // se falhar, o modal mostra o erro e continua aberto
    setIsConfirmOpen(false);
    setToastMessage("Notas da sessão fechadas e enviadas.");
  };

  const room = roomId ? rooms.find((r) => r.id === roomId) : null;
  const roomCodeTag = room
    ? `${room.code} - ${room.semester ?? "2026.2"}`
    : "TEC499 - 2026.2";

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col justify-between font-sans">
      {toastMessage && <Toast message={toastMessage} type="success" onClose={clearToast} />}
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
          {isClosed && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
              <Lock size={14} />
              Notas fechadas: somente consulta
            </p>
          )}
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

          {/* Botão 2: Fechar notas da sessão (a sessão fica aberta até este clique) */}
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={isClosed || isLoadingGrades}
            className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isClosed ? "Notas da sessão fechadas" : "Fechar notas da sessão"}
          </button>

          {/* Botão 3: Sair da sessão (só sai da tela, não fecha as notas) */}
          <button
            type="button"
            onClick={onCloseSession}
            className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all text-center cursor-pointer"
          >
            Sair da sessão
          </button>
        </div>
      </main>

      {isConfirmOpen && (
        <ConfirmModal
          title="Fechar notas da sessão"
          message={
            <>
              Ao fechar as notas, elas serão enviadas e <strong>não poderão mais ser alteradas</strong>. Deseja
              continuar?
            </>
          }
          confirmLabel="Fechar notas"
          variant="danger"
          onConfirm={handleConfirmCloseGrades}
          onClose={() => setIsConfirmOpen(false)}
        />
      )}
    </div>
  );
}
