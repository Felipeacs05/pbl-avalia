// src/components/features/reports/reportFormat.ts

// Valor exibido quando o aluno não tem nota no problema ou não tem média (nunca "0")
export const EMPTY_VALUE = "—";
export const EMPTY_VALUE_TITLE = "Sem nota";

// Uma casa decimal com vírgula: 7.3999… -> "7,4", 8 -> "8,0"; ausente -> "—"
export function formatGrade(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY_VALUE;
  return value.toFixed(1).replace(".", ",");
}
