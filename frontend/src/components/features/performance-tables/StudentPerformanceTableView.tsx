// src/components/features/performance-tables/StudentPerformanceTableView.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Share2, User, Users } from "lucide-react";
import { useRooms } from "../../../hooks/useRooms";
import { useSessionRoster } from "../../../hooks/useSessionRoster";
import { useCopyLink } from "../../../hooks/useCopyLink";
import { useStudentEvaluation } from "../../../hooks/useStudentEvaluation";
import { useCriteriaPreset } from "../../../hooks/useCriteriaPreset";
import { Toast } from "../../ui/Toast";
import { CriteriaScoreCard } from "./CriteriaScoreCard";

interface StudentPerformanceTableViewProps {
  roomId?: string;
  problemId?: string;
  sessionId: string;
  studentId: string;
  onBack: () => void;
}

export function StudentPerformanceTableView({
  roomId,
  problemId,
  sessionId,
  studentId,
  onBack,
}: StudentPerformanceTableViewProps) {
  // Reutilização de hooks existentes
  const { rooms } = useRooms();
  const { roster, isLoading: isRosterLoading } = useSessionRoster(sessionId);
  const { copyLink, toast: copyToast, clearToast: clearCopyToast } = useCopyLink();

  // Localiza o aluno correspondente ao ID
  const currentStudent = roster?.students.find((s) => s.id === studentId);
  const studentName = currentStudent?.name || "Aluno";
  const studentTags = currentStudent?.tags || [];

  const routeParams = useParams<{ problemId?: string }>();
  const { criteria: presetCriteria, isLoading: isPresetLoading } = useCriteriaPreset(
    problemId ?? routeParams?.problemId ?? ""
  );
  // Os cards de nota vêm do CRUD do Pré-set (mesma lista, nome e peso)
  const weightedCriteria = presetCriteria.filter((c) => !c.isToggle);

  // Hook de gestão do estado da avaliação do aluno
  const {
    evaluation,
    isLoading: isEvaluationLoading,
    isSaving,
    toastMessage,
    toastType,
    clearToast,
    updateCriterionScore,
    setMessage,
    saveEvaluation,
  } = useStudentEvaluation(sessionId, studentId, studentName, studentTags);

  const room = roomId ? rooms.find((r) => r.id === roomId) : null;
  const roomCodeTag = room
    ? `${room.code} - ${room.semester ?? "2026.2"}`
    : "TEC499 - 2026.2";

  const handleShare = () => {
    if (typeof window !== "undefined") {
      copyLink(window.location.pathname);
    }
  };

  const scores = evaluation?.criteria ?? {};

  const handleSave = async () => {
    let totalWeightedScore = 0;
    let totalWeights = 0;
    weightedCriteria.forEach((c) => {
      const score = scores[c.id] ?? 100;
      totalWeightedScore += score * (c.weight / 100);
      totalWeights += c.weight;
    });
    const calculatedGrade =
      totalWeights > 0 ? Number(((totalWeightedScore / totalWeights) * 10).toFixed(1)) : 10.0;
    await saveEvaluation(calculatedGrade);
  };

  // sem tags de exemplo: mostra só as marcações reais da sessão
  const tags =
    evaluation?.tags && evaluation.tags.length > 0
      ? evaluation.tags
      : (currentStudent?.tags || []);

  const message = evaluation?.message || "";

  const isLoading = isRosterLoading || isEvaluationLoading || isPresetLoading;

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col justify-between font-sans">
      {/* Toast Feedback (Reutilizado) */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={clearToast}
        />
      )}
      {copyToast && (
        <Toast
          message={copyToast.message}
          type={copyToast.type}
          onClose={clearCopyToast}
        />
      )}

      {/* Top Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="min-h-11 min-w-11 w-11 h-11 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-800 cursor-pointer"
          aria-label="Voltar para a tela de avaliação"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-5 py-1.5 rounded-full tracking-wide select-none">
          {roomCodeTag}
        </div>

        <button
          onClick={handleShare}
          type="button"
          className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-[#C5CCE8] text-[#2E3A70] flex items-center justify-center hover:bg-[#B7BFDF] active:scale-95 transition-all cursor-pointer"
          aria-label="Compartilhar avaliação"
          title="Copiar link da avaliação"
        >
          <Share2 size={19} />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* Title Box: "Tabela de Desempenho" */}
        <div className="w-full bg-white rounded-3xl border border-gray-200/80 shadow-xs py-3.5 px-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Tabela de Desempenho
          </h1>
          <p className="mt-1 text-xs text-gray-500 font-medium">
            Avaliando Aluno: {studentName}
          </p>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 animate-pulse font-medium">
              Carregando critérios de avaliação...
            </p>
          </div>
        ) : (
          <>
            {/* Seção CRITÉRIOS */}
            <section className="flex flex-col gap-2.5">
              <h2 className="text-xs font-bold text-gray-500 tracking-wider uppercase px-1">
                CRITÉRIOS
              </h2>

              <div className="flex flex-col gap-2.5">
                {weightedCriteria.map((c) => (
                  <CriteriaScoreCard
                    key={c.id}
                    title={c.name}
                    weightLabel={`Peso ${c.weight}%`}
                    score={scores[c.id] ?? 100}
                    onScoreChange={(value) => updateCriterionScore(c.id, value)}
                  />
                ))}
              </div>
            </section>

            {/* Seção Marcações Recebidas */}
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-bold text-gray-600 px-1">
                Marcações Recebidas pelo aluno durante a sessão
              </h2>
              <div className="w-full bg-white rounded-2xl border border-gray-200/90 p-4 min-h-[90px] flex flex-wrap gap-2 content-start shadow-xs">
                {tags.length === 0 && (
                  <p className="text-xs italic text-gray-400">Nenhuma marcação recebida nesta sessão.</p>
                )}
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#D1D5DB]/60 border border-gray-400/60 text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            {/* Seção Autoavaliação do Aluno */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <User size={16} className="text-[#4354A0]" />
                  <span>Autoavaliação do Aluno</span>
                </h2>
                {evaluation?.selfEvaluation?.score !== undefined && (
                  <span className="text-xs font-bold text-[#4354A0] bg-[#EEEDF8] px-2.5 py-1 rounded-full border border-[#757DC3]/30">
                    Nota: {evaluation.selfEvaluation.score.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 10
                  </span>
                )}
              </div>
              <div className="w-full bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs">
                {evaluation?.selfEvaluation ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Reflexão do Aluno:</p>
                    <p className="text-sm text-gray-800 italic bg-gray-50 p-3 rounded-xl border border-gray-100">
                      &quot;{evaluation.selfEvaluation.comments || "Sem comentários adicionais."}&quot;
                    </p>
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-400">
                    O aluno ainda não enviou sua autoavaliação ou a autoavaliação não foi liberada.
                  </p>
                )}
              </div>
            </section>

            {/* Seção Avaliações entre Pares (Colegas) */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <Users size={16} className="text-[#4354A0]" />
                  <span>Avaliações dos Colegas (Avaliação entre Pares)</span>
                </h2>
                {evaluation?.peerEvaluations && evaluation.peerEvaluations.length > 0 && (
                  <span className="text-xs font-semibold text-gray-500">
                    {evaluation.peerEvaluations.length} {evaluation.peerEvaluations.length === 1 ? "avaliação" : "avaliações"}
                  </span>
                )}
              </div>
              <div className="w-full bg-white rounded-2xl border border-gray-200/90 p-4 shadow-xs space-y-3">
                {(!evaluation?.peerEvaluations || evaluation.peerEvaluations.length === 0) ? (
                  <p className="text-xs italic text-gray-400">
                    Nenhuma avaliação entre pares enviada por colegas até o momento.
                  </p>
                ) : (
                  evaluation.peerEvaluations.map((peer, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">
                          {peer.evaluatorName}
                        </span>
                        <span className="text-xs font-bold text-[#4354A0] bg-[#EEEDF8] px-2 py-0.5 rounded-md">
                          Nota {peer.score.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                      </div>
                      {peer.comments ? (
                        <p className="text-xs text-gray-600 italic">
                          &quot;{peer.comments}&quot;
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">
                          Sem comentário registrado.
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Seção Mensagem ao aluno */}
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-bold text-gray-600 px-1">
                Mensagem ao aluno
              </h2>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Adicione observações ou feedback para o aluno..."
                rows={4}
                className="w-full bg-white rounded-2xl border border-gray-200/90 p-4 min-h-[120px] text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#757DC3] shadow-xs resize-none"
              />
            </section>

            {/* Botão de Salvar Avaliação */}
            <div className="w-full pt-3 pb-6 mt-auto">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus size={20} />
                <span>
                  {isSaving ? "Salvando Avaliação..." : "Salvar Avaliação"}
                </span>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
