// src/components/features/evaluations/PeerEvaluationModal.tsx

"use client";

import React, { useEffect, useState } from "react";
import { X, Users, Lock, Loader2 } from "lucide-react";
import type { Student } from "../../../types/student";
import type { PeerEvaluationItem, PeerEvaluationSubmission } from "../../../types/evaluation";
import { PeerEvaluationCard, PEER_CRITERIA, type DraftScores } from "./PeerEvaluationCard";

// Rascunho de um colega: notas ainda podem estar vazias (null) enquanto o aluno preenche
type PeerDraft = { scores: DraftScores; comment: string };

// Rascunho vazio: todas as notas começam sem valor (null) e o comentário vazio ("").
const EMPTY_DRAFT: PeerDraft = { scores: { content: null, participation: null, behavior: null }, comment: "" };

// Formato mínimo do erro HTTP (axios)
type HttpError = { response?: { status?: number } };

interface PeerEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Vem da API/mock. false = avaliação entre pares não liberada pelo tutor:
  // a lista some e o aluno vê só o aviso.
  isEvaluationOpen: boolean;
  // Colegas do grupo, SEM o próprio aluno
  peers: Student[];
  // A página envia os dados. Deve lançar o erro da API em caso de falha (ex.: 403).
  onSubmit: (data: PeerEvaluationSubmission) => Promise<void>;
}

export function PeerEvaluationModal({ isOpen, onClose, isEvaluationOpen, peers, onSubmit }: PeerEvaluationModalProps) {
  // Rascunho de cada colega, guardado pelo id. Colega ainda não mexido não está no objeto.
  const [drafts, setDrafts] = useState<Record<string, PeerDraft>>({});
  // Qual card está aberto. Começa com o primeiro colega aberto, como no Figma.
  const [expandedId, setExpandedId] = useState<string | null>(peers[0]?.id ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fecha com a tecla Esc (mesmo comportamento dos outros modais do projeto)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getDraft = (studentId: string): PeerDraft => drafts[studentId] ?? EMPTY_DRAFT;

  // Atualiza só a parte que mudou (uma nota ou o comentário) de um colega
  const updateDraft = (studentId: string, changes: Partial<PeerDraft>) => {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] ?? EMPTY_DRAFT), ...changes } }));
  };

  // ---------------------------------------------------------------------------
  // Conta quantas notas obrigatórias ainda estão vazias somando todos os colegas.
  // O botão só ativa quando esse número chega a zero.
  const missingScores = peers.reduce(
    (total, peer) => total + PEER_CRITERIA.filter(({ key }) => getDraft(peer.id).scores[key] === null).length,
    0
  );
  const canSubmit = peers.length > 0 && missingScores === 0;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return; // evita envio incompleto ou duplicado
    setError(null);
    setIsSubmitting(true);
    try {
      // Aqui todas as notas já estão preenchidas
      const evaluations: PeerEvaluationItem[] = peers.map((peer) => {
        const { scores, comment } = getDraft(peer.id);
        return {
          studentId: peer.id,
          scores: {
            content: scores.content as number,
            participation: scores.participation as number,
            behavior: scores.behavior as number,
          },
          comment: comment.trim(),
        };
      });
      await onSubmit({ evaluations });
      onClose(); // só fecha se o envio deu certo
    } catch (err) {
      // 403 avaliação fechada pelo tutor ou colega que não é da sala do aluno
      if ((err as HttpError).response?.status === 403) {
        setError("Não foi possível enviar: a avaliação foi encerrada ou você não tem permissão para avaliar estes colegas.");
      } else {
        setError("Não foi possível enviar suas avaliações agora. Tente novamente em instantes.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="peer-evaluation-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose} // clicar no fundo escuro fecha o modal
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto bg-white rounded-[1.75rem] p-6 shadow-2xl flex flex-col gap-5 text-gray-900 animate-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho: mesmo formato do modal de Tags e da autoavaliação */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center">
            <Users size={22} />
          </div>
          <div className="flex-1">
            <h2 id="peer-evaluation-title" className="text-xl font-bold leading-tight">
              Avaliação por pares
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Suas notas são anônimas para os colegas.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Avaliação não liberada: a lista nem é montada e o aluno vê só o aviso */}
        {!isEvaluationOpen ? (
          <>
            <div role="status" className="flex flex-col items-center text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center mb-3">
                <Lock size={22} />
              </div>
              <h3 className="text-base font-bold mb-1">Período de avaliação entre pares encerrado/inativo</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                A avaliação entre pares deste problema não está disponível no momento. Se achar que isso é um erro, fale com seu tutor.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-[#4354A0] hover:bg-[#384890] text-white font-bold text-sm transition-colors"
            >
              Entendi
            </button>
          </>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Colegas do grupo ({peers.length})
            </p>

            {peers.length === 0 ? (
              <p className="text-xs italic text-gray-400">Nenhum colega no seu grupo para avaliar.</p>
            ) : (
              <ul className="flex flex-col gap-3 list-none p-0">
                {peers.map((peer) => {
                  const draft = getDraft(peer.id);
                  return (
                    <li key={peer.id}>
                      <PeerEvaluationCard
                        peer={peer}
                        scores={draft.scores}
                        comment={draft.comment}
                        isExpanded={expandedId === peer.id}
                        // Abre este card; se ele já estava aberto, fecha
                        onToggle={() => setExpandedId((current) => (current === peer.id ? null : peer.id))}
                        onScoreChange={(key, value) => updateDraft(peer.id, { scores: { ...draft.scores, [key]: value } })}
                        onCommentChange={(value) => updateDraft(peer.id, { comment: value })}
                        disabled={isSubmitting}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            {(
              <p className="text-xs text-gray-500 text-center">
                Preencha todas as notas para enviar.
              </p>
            )}

            {/* role="alert" faz o leitor de tela (e os testes) encontrarem a mensagem de erro */}
            {error && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="py-3.5 rounded-2xl border border-gray-300 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                // Enquanto envia, também fica desativado
                disabled={!canSubmit || isSubmitting}
                className={`py-3.5 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                  canSubmit ? "bg-[#4354A0] hover:bg-[#384890] text-white disabled:opacity-70" : "bg-gray-300 text-gray-500"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Avaliações</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
