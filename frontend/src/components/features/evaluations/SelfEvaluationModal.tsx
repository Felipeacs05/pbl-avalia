// src/components/features/evaluations/SelfEvaluationModal.tsx

// O modal NÃO chama a API sozinho. A página é quem:
//   1. diz se a autoavaliação está aberta (isEvaluationOpen, vindo da API/mock);
//   2. passa a lista de colegas (peers);
//   3. envia os dados recebidos no onSubmit.
// Assim, quando o endpoint existir, este componente não precisa mudar.
"use client";

import React, { useEffect, useState } from "react";
import { X, ClipboardCheck, Lock, Loader2 } from "lucide-react";
import type { PeerEvaluation, SelfEvaluationScores, SelfEvaluationSubmission } from "../../../types/evaluation";
import type { Student } from "../../../types/group";

const CRITERIA: { key: keyof SelfEvaluationScores; label: string }[] = [
  { key: "content", label: "Bom seguimento e conteúdo" },
  { key: "participation", label: "Participação" },
  { key: "behavior", label: "Comportamento" },
];

const MIN_SCORE = 0;
const MAX_SCORE = 10;

const INITIAL_SCORES: SelfEvaluationScores = { content: 0, participation: 0, behavior: 0 };

function clampScore(value: number): number {
  if (Number.isNaN(value)) return MIN_SCORE;
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(value)));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type HttpError = { response?: { status?: number } };

const SECTION_LABEL = "text-[11px] font-bold uppercase tracking-wider text-gray-500";
const FIELD_BOX = "rounded-2xl border border-gray-200 px-4 py-3";
const SLIDER = "w-full accent-[#4354A0] cursor-pointer disabled:cursor-not-allowed";

interface SelfEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEvaluationOpen: boolean;
  peers: Student[];
  onSubmit: (data: SelfEvaluationSubmission) => Promise<void>;
}

export function SelfEvaluationModal({ isOpen, onClose, isEvaluationOpen, peers, onSubmit }: SelfEvaluationModalProps) {
  const [scores, setScores] = useState<SelfEvaluationScores>(INITIAL_SCORES);
  const [justification, setJustification] = useState("");
  const [peerEvaluations, setPeerEvaluations] = useState<Record<string, { score: number; comment: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleScoreChange = (key: keyof SelfEvaluationScores, value: string) => {
    setScores((prev) => ({ ...prev, [key]: clampScore(Number(value)) }));
  };

  const getPeerEvaluation = (studentId: string) => peerEvaluations[studentId] ?? { score: MIN_SCORE, comment: "" };

  const updatePeer = (studentId: string, changes: Partial<{ score: number; comment: string }>) => {
    setPeerEvaluations((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { score: MIN_SCORE, comment: "" }), ...changes },
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true); // desabilita os botões para evitar envio duplicado
    try {
      // Uma entrada para CADA colega da lista (inclusive os não mexidos, com nota 0),
      // para o back-end receber todos os membros do grupo
      const peersPayload: PeerEvaluation[] = peers.map((peer) => {
        const { score, comment } = getPeerEvaluation(peer.id);
        return { studentId: peer.id, score, comment: comment.trim() };
      });
      await onSubmit({ scores, justification: justification.trim(), peers: peersPayload });
      onClose(); // só fecha se o envio deu certo
    } catch (err) {
      // 403 o back-end recusa quando a chave da US11 foi desativada ou quando o aluno avalia alguém que não é da sala dele.
      if ((err as HttpError).response?.status === 403) {
        setError("Não foi possível enviar: a autoavaliação foi encerrada ou você não tem permissão para avaliar nesta sala.");
      } else {
        setError("Não foi possível enviar sua autoavaliação agora. Tente novamente em instantes.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-evaluation-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* stopPropagation: clicar dentro do card não fecha o modal.
          max-h + overflow-y-auto: com muitos colegas, o conteúdo rola por dentro do card. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto bg-white rounded-[1.75rem] p-6 shadow-2xl flex flex-col gap-5 text-gray-900 animate-in zoom-in-95 duration-200"
      >
        {/* Cabeçalho: ícone em quadrado lilás + título + subtítulo, igual ao modal de Tags */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center">
            <ClipboardCheck size={22} />
          </div>
          <div className="flex-1">
            <h2 id="self-evaluation-title" className="text-xl font-bold leading-tight">
              Autoavaliação
            </h2>

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

        {/* Renderização condicional (subtarefa 2): se a avaliação estiver fechada,
            o formulário nem é montado e o aluno vê só o aviso. */}
        {!isEvaluationOpen ? (
          <>
            <div role="status" className="flex flex-col items-center text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#EEEDF8] text-[#4354A0] flex items-center justify-center mb-3">
                <Lock size={22} />
              </div>
              <h3 className="text-base font-bold mb-1">Período de autoavaliação encerrado/inativo</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                A autoavaliação deste problema não está disponível no momento. Se achar que isso é um erro, fale com seu tutor.
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
            {/* Notas do próprio aluno (subtarefa 1: input numérico restrito de 0 a 10) */}
            <div className="flex flex-col gap-3">
              <p className={SECTION_LABEL}>Notas</p>
              {CRITERIA.map(({ key, label }) => (
                <div key={key} className={FIELD_BOX}>
                  <div className="flex items-baseline justify-between">
                    {/* htmlFor liga o nome ao slider: clicar no nome foca o campo e o leitor de tela o anuncia */}
                    <label htmlFor={`self-score-${key}`} className="text-sm font-semibold">
                      {label}
                    </label>
                    {/* Valor escolhido: o slider sozinho não mostra o número */}
                    <span className="text-sm font-bold text-[#4354A0]">{scores[key]}</span>
                  </div>

                  {/* Marcações 0, 5 e 10 do Figma */}
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>

                  {/* type="range" só aceita valores entre min e max; step={1} impede notas quebradas como 7.5 */}
                  <input
                    id={`self-score-${key}`}
                    type="range"
                    min={MIN_SCORE}
                    max={MAX_SCORE}
                    step={1}
                    value={scores[key]}
                    onChange={(e) => handleScoreChange(key, e.target.value)}
                    disabled={isSubmitting}
                    aria-valuetext={`${scores[key]} de ${MAX_SCORE}`}
                    className={SLIDER}
                  />
                </div>
              ))}
            </div>

            {/* Justificativa (textarea opcional) */}
            <div className="flex flex-col gap-2">
              <label htmlFor="self-evaluation-justification" className={SECTION_LABEL}>
                Justificativa (opcional)
              </label>
              <textarea
                id="self-evaluation-justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                disabled={isSubmitting}
                placeholder="Como foi sua participação nessa sessão?"
                rows={3}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm placeholder:text-gray-400 outline-none focus:border-[#4354A0] focus:ring-2 focus:ring-[#4354A0]/15 resize-none"
              />
            </div>

            <hr className="border-gray-100" />

            {/* Colegas do grupo (regra de negócio da US13: todos listados na mesma tela) */}
            <div className="flex flex-col gap-3">
              <p className={SECTION_LABEL}>Colegas do grupo ({peers.length})</p>

              {peers.length === 0 ? (
                // Sem colegas (aluno sozinho ou grupo ainda vazio): mesmo estilo do "Nenhuma tag adicionada ainda"
                <p className="text-xs italic text-gray-400">Nenhum colega no seu grupo para avaliar.</p>
              ) : (
                // <ul>/<li>: cada colega é um item de lista (acessibilidade e testes com role="listitem")
                <ul className="flex flex-col gap-3 list-none p-0">
                  {peers.map((peer) => {
                    const { score, comment } = getPeerEvaluation(peer.id);
                    return (
                      <li key={peer.id} className={FIELD_BOX}>
                        {/* Avatar com iniciais + nome + nota escolhida */}
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 shrink-0 rounded-full bg-[#EEEDF8] text-[#4354A0] text-xs font-bold flex items-center justify-center">
                            {getInitials(peer.name)}
                          </div>
                          <label htmlFor={`peer-score-${peer.id}`} className="flex-1 text-sm font-semibold">
                            {peer.name}
                          </label>
                          <span className="text-sm font-bold text-[#4354A0]">{score}</span>
                        </div>

                        <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                          <span>0</span>
                          <span>5</span>
                          <span>10</span>
                        </div>

                        {/* Mesma restrição das notas do aluno: só inteiros de 0 a 10 */}
                        <input
                          id={`peer-score-${peer.id}`}
                          type="range"
                          min={MIN_SCORE}
                          max={MAX_SCORE}
                          step={1}
                          value={score}
                          onChange={(e) => updatePeer(peer.id, { score: clampScore(Number(e.target.value)) })}
                          disabled={isSubmitting}
                          aria-valuetext={`${score} de ${MAX_SCORE}`}
                          className={SLIDER}
                        />

                        {/* Comentário opcional; aria-label porque o campo não tem um label visível próprio */}
                        <textarea
                          value={comment}
                          onChange={(e) => updatePeer(peer.id, { comment: e.target.value })}
                          disabled={isSubmitting}
                          aria-label={`Comentário sobre ${peer.name}`}
                          placeholder="Comentário (opcional)"
                          rows={2}
                          className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-xs placeholder:text-gray-400 outline-none focus:border-[#4354A0] resize-none"
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* role="alert" faz o leitor de tela (e os testes) encontrarem a mensagem de erro */}
            {error && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {/* Rodapé igual ao do modal de Tags: "Cancelar" com borda + botão principal preenchido */}
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
                disabled={isSubmitting}
                className="py-3.5 rounded-2xl bg-[#4354A0] hover:bg-[#384890] text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar Avaliação</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
