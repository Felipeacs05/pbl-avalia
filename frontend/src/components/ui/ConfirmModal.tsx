// src/components/ui/ConfirmModal.tsx

// Modal genérico de confirmação ("Tem certeza?"). Usado pelos botões do card de problema
// (extrair, editar e excluir), e pode ser reaproveitado em qualquer outra ação do app.
"use client";

import React, { useEffect, useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "danger"; // "danger" deixa o botão vermelho (ex.: excluir)
  onConfirm: () => void | Promise<void>; // pode ser async: o modal mostra o carregamento
  onClose: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDanger = variant === "danger";

  // Esc fecha, exceto enquanto a ação está em andamento
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConfirming) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isConfirming]);

  const handleConfirm = async () => {
    setError(null);
    setIsConfirming(true);
    try {
      await onConfirm(); // quem fecha o modal (ou navega) é a página
    } catch {
      setError("Não foi possível concluir a ação. Tente novamente.");
      setIsConfirming(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => !isConfirming && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-gray-800 flex flex-col gap-4"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isConfirming}
          aria-label="Fechar"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger ? "bg-red-100 text-red-600" : "bg-[#EEEDF8] text-[#4354A0]"
            }`}
          >
            <AlertTriangle size={20} />
          </div>
          <h2 id="confirm-modal-title" className="text-lg font-bold text-gray-900 leading-tight">
            {title}
          </h2>
        </div>

        <div id="confirm-modal-message" className="text-sm text-gray-600 leading-relaxed">
          {message}
        </div>

        {error && (
          <p role="alert" className="text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            autoFocus={isDanger} // em ações perigosas, o foco começa em "Cancelar" (Enter não exclui por acidente)
            className="py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            autoFocus={!isDanger}
            className={`py-3 rounded-2xl text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 ${
              isDanger ? "bg-red-600 hover:bg-red-700" : "bg-[#4354A0] hover:bg-[#384890]"
            }`}
          >
            {isConfirming && <Loader2 size={16} className="animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
