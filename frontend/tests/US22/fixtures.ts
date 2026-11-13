// Fixtures da US22 — Verificação de e-mail no cadastro.
//
// Objetivo da US: a conta só é confirmada com o código enviado por e-mail no cadastro; até lá o usuário
// pode logar, mas não pode criar nem ingressar em salas (403). O front leva esse usuário à tela de
// verificação e, confirmado o código, devolve-o às salas.
//
// TDD: estes testes são escritos antes do código e fixam o contrato abaixo, camada por camada.
//
//  1. SERVICE (HTTP) — src/services/emailVerificationService.ts
//     Usa a instância axios de src/services/api.ts (baseURL .../api/v1, como o login da US02), pois o
//     AuthController do backend fica em /api/v1/auth:
//       verifyEmail(email, code)  -> api.post("/auth/verify-email", { email, code })
//       resendVerification(email) -> api.post("/auth/resend-verification", { email })
//     Sucesso devolve o corpo ({ message }); erro rejeita com { status, message } (status 0 = sem resposta).
//
//  2. HOOK (estado + navegação) — src/hooks/useEmailVerification.ts
//     useEmailVerification() -> { verifyEmail(email, code), resendVerification(email), isSubmitting, successMessage, error }
//     Após verificar com sucesso, navega para AFTER_VERIFY_ROUTE (pode haver um atraso curto p/ mostrar a mensagem).
//
//  3. COMPONENTES (UI) — src/components/features/email-verification/
//     VerifyEmailPanel: container; lê o e-mail do usuário logado (getLoggedUserProfile) e liga o hook ao form.
//     VerifyEmailForm: apresentação; <VerifyEmailForm email onVerify onResend isSubmitting? successMessage? error? />
//     A página src/app/verify-email/page.tsx só renderiza o Panel.
//
//  INFRA (interceptores) — src/services/api.ts e src/services/authFetch.ts
//     403 com code === EMAIL_NOT_VERIFIED_CODE -> window.location.href = "/verify-email", sem apagar o token,
//     e o erro continua chegando a quem chamou. Outros 403 seguem como hoje. Já estando em /verify-email,
//     não redireciona (evita recarregar a tela e perder a mensagem de erro).
//
// COMBINAR COM O BACK-END: o GlobalExceptionHandler hoje devolve { timestamp, status, error, message }.
// Para o front distinguir "e-mail não verificado" de um 403 comum (ex.: não é o tutor da sala), o 403
// precisa trazer o campo "code" abaixo. Se o nome mudar, troque só esta constante.
// As rotas /api/v1/auth/verify-email e /resend-verification também precisam estar liberadas no SecurityConfig
// (hoje só register e login estão em permitAll).
export const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";

// Rotas relativas ao baseURL do axios (/api/v1)
export const VERIFY_EMAIL_ROUTE = "/auth/verify-email";
export const RESEND_VERIFICATION_ROUTE = "/auth/resend-verification";

// Página do front; aceita query string (ex.: /verify-email?email=...)
export const VERIFY_EMAIL_PAGE = /^\/verify-email(\?.*)?$/;
// Para onde o usuário volta depois de confirmar (mesmo destino do login da US02)
export const AFTER_VERIFY_ROUTE = "/teacher-rooms";
// Tempo máximo tolerado entre a confirmação e a navegação
export const MAX_REDIRECT_DELAY_MS = 3000;

export const PENDING_EMAIL = "joao@uefs.br";
export const PENDING_USER = { id: "usr_22", name: "João", email: PENDING_EMAIL };
export const PENDING_USER_TOKEN = "jwt-usuario-pendente";
export const VALID_CODE = "482913";
export const EXPIRED_CODE = "000000";

// Textos do backend; os testes conferem que o front repassa exatamente o que recebeu
export const VERIFY_SUCCESS_TEXT = "E-mail verificado com sucesso.";
export const RESEND_TEXT = "Enviamos um novo código para o seu e-mail.";
export const INVALID_CODE_TEXT = "Código inválido ou expirado.";
export const INVALID_CODE_MESSAGE = /código inválido ou expirado/i;
export const ALREADY_VERIFIED_TEXT = "Este e-mail já foi verificado.";
export const NOT_VERIFIED_TEXT = "Confirme seu e-mail para continuar.";
export const FORBIDDEN_TEXT = "Você não tem permissão para acessar este recurso.";

// 403 de usuário pendente (POST /rooms e POST /rooms/join), no formato do GlobalExceptionHandler + code
export const makeNotVerifiedBody = () => ({
  timestamp: "2026-11-12T10:00:00",
  status: 403,
  error: "Forbidden",
  message: NOT_VERIFIED_TEXT,
  code: EMAIL_NOT_VERIFIED_CODE,
});

// 403 comum, sem relação com a US22: não pode redirecionar
export const makeGenericForbiddenBody = () => ({
  timestamp: "2026-11-12T10:00:00",
  status: 403,
  error: "Forbidden",
  message: FORBIDDEN_TEXT,
});

// Corpos de sucesso do backend
export const makeVerifyResponse = () => ({ message: VERIFY_SUCCESS_TEXT });
export const makeResendResponse = () => ({ message: RESEND_TEXT });

// Contrato de erro do service (o que o hook recebe): { status, message }
export const makeExpiredCodeError = () => ({ status: 403, message: INVALID_CODE_TEXT });

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// jsdom não deixa atribuir window.location.href; troca por um objeto simples (mesmo padrão do US02/api.test)
export function mockWindowLocation(href = "http://localhost:3000/teacher-rooms") {
  const original = window.location;
  delete (window as unknown as { location: unknown }).location;
  window.location = { href, pathname: new URL(href).pathname } as unknown as Location;
  return () => {
    window.location = original;
  };
}
