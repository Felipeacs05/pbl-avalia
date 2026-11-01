// src/components/features/session-roles/SessionRoleForm.tsx

// Usado na lista de papéis (SessionRoleList) e no modal aberto pela linha da chamada.
// A regra "um aluno por papel" é do backend: aqui só se valida a nota extra (0 a 10).
"use client";

import React, { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import type { SessionRole } from "../../../types/sessionRole";
import { SESSION_ROLE_LABELS, SESSION_ROLES } from "./sessionRoleOptions";

export const EXTRA_GRADE_MESSAGE = "A nota extra deve estar entre 0 e 10.";
const ROLE_REQUIRED_MESSAGE = "Selecione um papel para atribuir.";

/** Aceita vírgula (teclado pt-BR no celular). Devolve null se não for número de 0 a 10. */
export function parseExtraGrade(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  if (Number.isNaN(value) || value < 0 || value > 10) return null;
  return value;
}

interface SessionRoleFormProps {
  initialRole: SessionRole | null;
  initialExtraGrade: number | null;
  isSaving?: boolean;
  /** "compact": dentro da linha da lista. "stacked": no modal, um campo por linha. */
  layout?: "compact" | "stacked";
  onSubmit: (role: SessionRole, extraGrade: number) => void | Promise<void>;
}

export function SessionRoleForm({
  initialRole,
  initialExtraGrade,
  isSaving = false,
  layout = "compact",
  onSubmit,
}: SessionRoleFormProps) {
  const id = useId();
  const [role, setRole] = useState<SessionRole | "">(initialRole ?? "");
  const [gradeText, setGradeText] = useState(initialExtraGrade != null ? String(initialExtraGrade) : "");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setValidationError(ROLE_REQUIRED_MESSAGE);
      return;
    }
    const extraGrade = parseExtraGrade(gradeText);
    if (extraGrade === null) {
      setValidationError(EXTRA_GRADE_MESSAGE);
      return; // nada vai para o backend
    }
    setValidationError(null);
    void onSubmit(role, extraGrade);
  };

  const isStacked = layout === "stacked";
  const fieldClass =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4354A0]";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <div className={isStacked ? "flex flex-col gap-3" : "grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2"}>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-role`} className="text-xs font-semibold text-gray-600">
            Papel
          </label>
          <select
            id={`${id}-role`}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as SessionRole | "");
              setValidationError(null);
            }}
            disabled={isSaving}
            className={fieldClass}
          >
            <option value="" disabled>
              Selecione
            </option>
            {SESSION_ROLES.map((r) => (
              <option key={r} value={r}>
                {SESSION_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-grade`} className="text-xs font-semibold text-gray-600">
            Nota extra
          </label>
          {/* type="text" + inputMode: aceita "0,5" do teclado brasileiro e não some com o "-" ao digitar */}
          <input
            id={`${id}-grade`}
            type="text"
            inputMode="decimal"
            placeholder="0 a 10"
            value={gradeText}
            onChange={(e) => {
              setGradeText(e.target.value);
              setValidationError(null);
            }}
            disabled={isSaving}
            aria-invalid={validationError === EXTRA_GRADE_MESSAGE}
            className={`${fieldClass} text-center`}
          />
        </div>
      </div>

      {validationError && (
        <p role="alert" className="text-xs font-semibold text-red-600">
          {validationError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full min-h-11 rounded-xl bg-[#4354A0] hover:bg-[#384890] active:scale-[0.99] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSaving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {/* Texto fixo: o botão é achado pelo nome "Atribuir" (o "Salvando…" aparece na linha do aluno) */}
        <span>Atribuir</span>
      </button>
    </form>
  );
}
