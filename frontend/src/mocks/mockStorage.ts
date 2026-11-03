// src/mocks/mockStorage.ts
// Guarda os mocks no localStorage do navegador para as telas do professor e do aluno verem os mesmos dados,
// mesmo em outra aba ou depois de recarregar a página (o "banco" falso continua sendo só do navegador).
// Some quando o back-end existir: os services passam a usar a API.

export function loadMock<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveMock(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem localStorage (aba anônima/bloqueado): os dados ficam só na memória desta aba
  }
}

// Quando outra aba salva (ex.: o professor edita), atualiza os dados desta aba (ex.: a do aluno)
export function onMockChange<T>(key: string, apply: (value: T) => void): void {
  if (typeof window === "undefined") return;
  window.addEventListener("storage", (event) => {
    if (event.key !== key || event.newValue === null) return;
    try {
      apply(JSON.parse(event.newValue) as T);
    } catch {
      // valor inválido: mantém o que já estava em memória
    }
  });
}
