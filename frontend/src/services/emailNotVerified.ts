// src/services/emailNotVerified.ts
// Usuário logado com e-mail pendente de verificação (US22): o backend recusa criar e ingressar em salas com 403

// COMBINAR COM O BACK-END: o 403 de e-mail não verificado precisa trazer o campo "code" com este valor,
// para o front distinguir de um 403 comum (ex.: não é o tutor da sala). Se o nome mudar, troque só esta constante.
export const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";
export const VERIFY_EMAIL_PAGE = "/verify-email";

/** Leva à tela de verificação quando o corpo do 403 é o de e-mail não verificado. Não encerra a sessão. */
export function redirectIfEmailNotVerified(status: number | undefined, data: unknown): void {
  if (status !== 403 || typeof window === "undefined") return;
  if ((data as { code?: unknown } | null)?.code !== EMAIL_NOT_VERIFIED_CODE) return;
  // Já na tela de verificação: recarregar faria o usuário perder a mensagem de erro
  if (window.location.pathname === VERIFY_EMAIL_PAGE) return;
  // Fora da árvore React (interceptor) não há useRouter
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = VERIFY_EMAIL_PAGE;
}
