import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, type AxiosAdapter, type AxiosResponse } from "axios";
import VerifyEmailPage from "@/app/verify-email/page";
import { api } from "@/services/api";
import {
  AFTER_VERIFY_ROUTE,
  EXPIRED_CODE,
  INVALID_CODE_MESSAGE,
  INVALID_CODE_TEXT,
  MAX_REDIRECT_DELAY_MS,
  mockWindowLocation,
  PENDING_EMAIL,
  PENDING_USER,
  PENDING_USER_TOKEN,
  RESEND_TEXT,
  VALID_CODE,
  VERIFY_SUCCESS_TEXT,
} from "../fixtures";

// INTEGRAÇÃO da tela /verify-email com todas as camadas reais:
// página -> VerifyEmailPanel -> VerifyEmailForm -> useEmailVerification -> emailVerificationService
// -> api.ts (axios com os interceptores). Só a rede é simulada, pelo adapter do axios (fronteira HTTP).

// O mock global do setup cria um push novo a cada chamada: aqui ele é um só, para o teste poder conferi-lo
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/verify-email",
  useSearchParams: () => new URLSearchParams(),
}));

// Rotas completas, como chegam ao backend (baseURL /api/v1 + AuthController em /auth)
const VERIFY_ROUTE = /\/api\/v1\/auth\/verify-email$/;
const RESEND_ROUTE = /\/api\/v1\/auth\/resend-verification$/;
const PAGE_HREF = "http://localhost:3000/verify-email";
const DAY_MS = 24 * 60 * 60 * 1000;

// Estado do fakeBackend: a conta pendente e a tabela EmailVerificationToken (uso único, validade de 24h)
interface StoredCode {
  code: string;
  expiresAt: number;
  used: boolean;
}

let verified: boolean;
let codes: StoredCode[];
let nextCode: number;
let requests: Array<{ url: string; body: Record<string, unknown> }>;

function errorBody(status: number, error: string, message: string) {
  return { timestamp: new Date().toISOString(), status, error, message };
}

// Regras do backend da US22 para as rotas de verificação
function respond(url: string, body: Record<string, unknown>): { status: number; data: unknown } {
  if (VERIFY_ROUTE.test(url)) {
    const stored = body.email === PENDING_EMAIL ? codes.find((code) => code.code === body.code) : undefined;
    if (!stored || stored.used) return { status: 400, data: errorBody(400, "Bad Request", INVALID_CODE_TEXT) };
    // Fluxo "expirado (403)" da QA
    if (stored.expiresAt <= Date.now()) return { status: 403, data: errorBody(403, "Forbidden", INVALID_CODE_TEXT) };
    stored.used = true;
    verified = true;
    return { status: 200, data: { message: VERIFY_SUCCESS_TEXT } };
  }
  if (RESEND_ROUTE.test(url)) {
    // Um novo código invalida os anteriores
    codes.forEach((code) => (code.used = true));
    codes.push({ code: String(nextCode++), expiresAt: Date.now() + DAY_MS, used: false });
    return { status: 200, data: { message: RESEND_TEXT } };
  }
  return { status: 404, data: errorBody(404, "Not Found", "Rota inexistente") };
}

const fakeBackend: AxiosAdapter = async (config) => {
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  const body = typeof config.data === "string" && config.data ? JSON.parse(config.data) : {};
  requests.push({ url, body });
  const { status, data } = respond(url, body);
  const response = { status, statusText: "", data, headers: {}, config } as AxiosResponse;
  if (status >= 400) {
    throw new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_REQUEST", config, null, response);
  }
  return response;
};

function bodiesSentTo(route: RegExp) {
  return requests.filter((request) => route.test(request.url)).map((request) => request.body);
}

const latestCode = () => codes[codes.length - 1].code;

async function renderPage() {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<VerifyEmailPage />);
  return {
    user,
    codeInput: () => screen.getByLabelText(/código/i),
    verifyButton: () => screen.getByRole("button", { name: /^(verificar|confirmar)/i }),
    resendButton: () => screen.getByRole("button", { name: /reenviar e-mail/i }),
  };
}

async function submitCode(code: string) {
  const view = await renderPage();
  await view.user.type(view.codeInput(), code);
  await view.user.click(view.verifyButton());
  return view;
}

// Passa a janela em que o hook pode aguardar antes de navegar
async function passRedirectWindow() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(MAX_REDIRECT_DELAY_MS);
  });
}

const originalAdapter = api.defaults.adapter;
let restoreLocation: () => void;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  push.mockReset();
  verified = false;
  codes = [
    // Código enviado no cadastro, ainda válido
    { code: VALID_CODE, expiresAt: Date.now() + DAY_MS, used: false },
    // Código de um envio anterior, vencido há 1h
    { code: EXPIRED_CODE, expiresAt: Date.now() - 60 * 60 * 1000, used: false },
  ];
  nextCode = 700001;
  requests = [];
  // Usuário logado e pendente: é quem o interceptor manda para esta tela
  localStorage.clear();
  localStorage.setItem("token", PENDING_USER_TOKEN);
  localStorage.setItem("user", JSON.stringify(PENDING_USER));
  restoreLocation = mockWindowLocation(PAGE_HREF);
  api.defaults.adapter = fakeBackend;
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  restoreLocation();
  localStorage.clear();
  vi.useRealTimers();
});

describe("[US22] Integração da página de verificação de e-mail", () => {
  it("Deve mostrar o e-mail do usuário logado como destino do código", async () => {
    await renderPage();

    expect(document.body).toHaveTextContent(PENDING_EMAIL);
    // Abrir a tela não dispara nada: o reenvio é só pelo botão
    expect(requests).toHaveLength(0);
  });

  // --- FLUXO VÁLIDO ---

  it("Deve confirmar a conta com o código do cadastro e levar o usuário de volta às salas, ainda logado", async () => {
    await submitCode(VALID_CODE);

    expect((await screen.findByRole("status")).textContent?.trim()).toBe(VERIFY_SUCCESS_TEXT);
    // Uma única chamada, em /api/v1/auth/verify-email, com o e-mail do usuário logado
    expect(bodiesSentTo(VERIFY_ROUTE)).toEqual([{ email: PENDING_EMAIL, code: VALID_CODE }]);
    expect(requests).toHaveLength(1);
    expect(verified).toBe(true);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await passRedirectWindow();
    expect(push).toHaveBeenCalledWith(AFTER_VERIFY_ROUTE);
    expect(localStorage.getItem("token")).toBe(PENDING_USER_TOKEN);
  });

  // --- FLUXOS RECUSADOS ---

  it("Deve exibir a recusa do código expirado (403) e manter o usuário na tela, logado e pendente", async () => {
    await submitCode(EXPIRED_CODE);

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_CODE_MESSAGE);
    expect(bodiesSentTo(VERIFY_ROUTE)).toEqual([{ email: PENDING_EMAIL, code: EXPIRED_CODE }]);
    expect(verified).toBe(false);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await passRedirectWindow();
    // O 403 desta tela não pode acionar o interceptor (recarregar a página) nem encerrar a sessão
    expect(window.location.href).toBe(PAGE_HREF);
    expect(localStorage.getItem("token")).toBe(PENDING_USER_TOKEN);
    expect(push).not.toHaveBeenCalled();
  });

  it.each([
    ["digitado errado", "123123", () => {}],
    ["já utilizado", VALID_CODE, () => (codes[0].used = true)],
  ])("Deve exibir a recusa do código %s (400) sem confirmar a conta", async (_case, code, arrange) => {
    arrange();

    await submitCode(code);

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_CODE_MESSAGE);
    expect(verified).toBe(false);
    await passRedirectWindow();
    expect(push).not.toHaveBeenCalled();
  });

  // --- REENVIO ---

  it("Deve reenviar um novo código para o e-mail do usuário sem confirmar a conta nem sair da tela", async () => {
    const { user, resendButton } = await renderPage();

    await user.click(resendButton());

    expect((await screen.findByRole("status")).textContent?.trim()).toBe(RESEND_TEXT);
    expect(bodiesSentTo(RESEND_ROUTE)).toEqual([{ email: PENDING_EMAIL }]);
    expect(bodiesSentTo(VERIFY_ROUTE)).toHaveLength(0);
    expect(verified).toBe(false);
    await passRedirectWindow();
    expect(push).not.toHaveBeenCalled();
  });

  it("Deve recuperar o fluxo expirado: reenviar e confirmar com o novo código emitido pelo backend", async () => {
    const { user, codeInput, verifyButton, resendButton } = await renderPage();

    await user.type(codeInput(), EXPIRED_CODE);
    await user.click(verifyButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_CODE_MESSAGE);

    await user.click(resendButton());
    expect((await screen.findByRole("status")).textContent?.trim()).toBe(RESEND_TEXT);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // O código usado agora é o que o backend acabou de emitir, e não um semeado
    const issued = latestCode();
    await user.clear(codeInput());
    await user.type(codeInput(), issued);
    await user.click(verifyButton());

    expect(await screen.findByText(VERIFY_SUCCESS_TEXT)).toBeInTheDocument();
    expect(bodiesSentTo(VERIFY_ROUTE)).toEqual([
      { email: PENDING_EMAIL, code: EXPIRED_CODE },
      { email: PENDING_EMAIL, code: issued },
    ]);
    expect(verified).toBe(true);
    await passRedirectWindow();
    expect(push).toHaveBeenCalledWith(AFTER_VERIFY_ROUTE);
  });

  it("Deve recusar o código do cadastro depois que um novo foi reenviado", async () => {
    const { user, codeInput, verifyButton, resendButton } = await renderPage();

    await user.click(resendButton());
    await screen.findByRole("status");

    await user.type(codeInput(), VALID_CODE);
    await user.click(verifyButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_CODE_MESSAGE);
    expect(verified).toBe(false);
  });
});
