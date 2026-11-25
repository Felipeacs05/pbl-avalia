"use client";

import React, { useEffect, useId, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface LeaveRoomModalProps {
  roomName: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isLeaving?: boolean;
  error?: string | null;
}

/**
 * Diálogo de confirmação para saída voluntária da sala tutorial.
 * Informa manutenção de dados, perda de acesso e notificação ao tutor antes de qualquer chamada à API.
 */
export function LeaveRoomModal({
  roomName,
  onConfirm,
  onClose,
  isLeaving = false,
  error = null,
}: LeaveRoomModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    return () => {
      if (dialog.open && typeof dialog.close === "function") {
        dialog.close();
      }
    };
  }, []);

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    if (!isLeaving) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
      className="m-auto w-full max-w-md rounded-3xl border-0 bg-white p-0 text-gray-800 shadow-2xl"
    >
      <div className="relative flex flex-col gap-4 p-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isLeaving}
          aria-label="Fechar"
          className="absolute top-5 right-5 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertTriangle size={20} aria-hidden="true" />
          </div>
          <h2 id={titleId} className="text-lg font-bold leading-tight text-gray-900">
            Sair de {roomName}?
          </h2>
        </div>

        <div id={descriptionId} className="space-y-2 text-sm leading-relaxed text-gray-600">
          <p>
            Ao confirmar a saída da sala <strong className="font-semibold text-gray-900">{roomName}</strong>:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Seus dados, notas e histórico serão mantidos no sistema.</li>
            <li>Você perderá o acesso imediato à sala, aos problemas e às sessões dela.</li>
            <li>O tutor responsável pela sala será notificado sobre a sua saída.</li>
          </ul>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
          >
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isLeaving}
            autoFocus
            className="cursor-pointer rounded-2xl border border-gray-300 bg-white py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLeaving}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#FF2957] py-3 text-sm font-bold text-white transition-colors hover:bg-[#E01E48] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLeaving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
            <span>Sair da sala</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
