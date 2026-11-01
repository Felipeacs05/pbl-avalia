import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ForgotPasswordPanel } from "@/components/features/password-recovery/ForgotPasswordPanel";
import { ResetPasswordPanel } from "@/components/features/password-recovery/ResetPasswordPanel";
import {
  EXPIRED_TOKEN,
  INVALID_TOKEN_MESSAGE,
  INVALID_TOKEN_TEXT,
  NEW_PASSWORD,
  OLD_PASSWORD,
  RECOVERY_TEXT,
  REGISTERED_EMAIL,
  RESET_SUCCESS_MESSAGE,
  RESET_SUCCESS_TEXT,
  UNREGISTERED_EMAIL,
  USED_TOKEN,
} from "../fixtures";

const RECOVER_ROUTE = /\/api\/auth\/password\/recover$/;
const RESET_ROUTE = /\/api\/auth\/password\/reset$/;

// Dados como estão no banco: a conta do João e os tokens de redefinição
interface StoredUser {
  email: string;
  password: string;
}

interface StoredToken {
  token: string;
  email: string;
  expiresAt: number;
  used: boolean;
}

let users: StoredUser[];
let tokens: StoredToken[];

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Regras fixadas pelo PasswordRecoveryIntegrationTest: resposta idêntica com ou sem conta, token de uso único
// com expiração e 400 com o texto em "error". O tokenVersion (sessões) só existe no backend e fica fora daqui
async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const body = init.body ? JSON.parse(String(init.body)) : {};

  if (init.method === "POST" && RECOVER_ROUTE.test(url)) {
    if (users.some((user) => user.email === body.email)) {
      tokens.push({ token: crypto.randomUUID(), email: body.email, expiresAt: Date.now() + 30 * 60_000, used: false });
    }
    return jsonResponse({ message: RECOVERY_TEXT }, 200);
  }

  if (init.method === "POST" && RESET_ROUTE.test(url)) {
    const stored = tokens.find((token) => token.token === body.token);
    if (!stored || stored.used || stored.expiresAt <= Date.now()) {
      return jsonResponse({ error: INVALID_TOKEN_TEXT }, 400);
    }
    const user = users.find((candidate) => candidate.email === stored.email)!;
    user.password = body.newPassword;
    stored.used = true;
    return jsonResponse({ message: RESET_SUCCESS_TEXT }, 200);
  }

  return jsonResponse({}, 404);
}

function postBodiesTo(route: RegExp) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url, init]) => init?.method === "POST" && route.test(String(url)))
    .map(([, init]) => JSON.parse(String(init?.body)));
}

const storedUser = () => users.find((user) => user.email === REGISTERED_EMAIL)!;

async function requestLink(email: string) {
  const user = userEvent.setup();
  const view = render(<ForgotPasswordPanel />);
  await user.type(screen.getByLabelText(/e-mail/i), email);
  await user.click(screen.getByRole("button", { name: /enviar link/i }));
  return view;
}

async function resetWith(token: string, newPassword: string) {
  const user = userEvent.setup();
  const view = render(<ResetPasswordPanel token={token} />);
  await user.type(screen.getByLabelText(/nova senha/i), newPassword);
  await user.click(screen.getByRole("button", { name: /redefinir senha/i }));
  return view;
}

beforeEach(() => {
  users = [{ email: REGISTERED_EMAIL, password: OLD_PASSWORD }];
  tokens = [
    { token: USED_TOKEN, email: REGISTERED_EMAIL, expiresAt: Date.now() + 30 * 60_000, used: true },
    { token: EXPIRED_TOKEN, email: REGISTERED_EMAIL, expiresAt: Date.now() - 5 * 60_000, used: false },
  ];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US21] Integração da recuperação de senha", () => {
  // --- SOLICITAÇÃO DO LINK ---

  it.each([
    ["cadastrado", REGISTERED_EMAIL, 1],
    ["não cadastrado", UNREGISTERED_EMAIL, 0],
  ])(
    "Deve mostrar a mesma confirmação para e-mail %s e só emitir link quando a conta existe",
    async (_case, email, issuedLinks) => {
      const tokensBefore = tokens.length;

      await requestLink(email);

      await screen.findByRole("status");
      // Uma única requisição em toda a tela: nenhuma consulta prévia de existência da conta
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
      expect(postBodiesTo(RECOVER_ROUTE)).toEqual([{ email }]);
      // A tela é idêntica nos dois casos; só o estado do backend difere
      expect(screen.getByRole("status").textContent?.trim()).toBe(RECOVERY_TEXT);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(tokens.length - tokensBefore).toBe(issuedLinks);
    },
  );

  // --- REDEFINIÇÃO ---

  it("Deve redefinir a senha com o link emitido e levar ao login sem permitir novo envio", async () => {
    const forgot = await requestLink(REGISTERED_EMAIL);
    await screen.findByRole("status");
    // O token que chega na tela de redefinição é o que o backend acabou de emitir, e não um semeado
    const issued = tokens[tokens.length - 1];
    forgot.unmount();

    await resetWith(issued.token, NEW_PASSWORD);

    expect(await screen.findByRole("status")).toHaveTextContent(RESET_SUCCESS_MESSAGE);
    expect(postBodiesTo(RESET_ROUTE)).toEqual([{ token: issued.token, newPassword: NEW_PASSWORD }]);
    expect(storedUser().password).toBe(NEW_PASSWORD);
    // As sessões anteriores foram invalidadas no backend: o caminho é entrar de novo
    expect(screen.getByRole("link", { name: /login/i })).toHaveAttribute("href", "/");
    // O token é de uso único: depois do sucesso não há o que reenviar
    expect(screen.queryByRole("button", { name: /redefinir senha/i })).not.toBeInTheDocument();
  });

  it.each([
    ["usado", USED_TOKEN],
    ["expirado", EXPIRED_TOKEN],
  ])("Deve exibir a recusa do link %s e não alterar a conta", async (_case, token) => {
    await resetWith(token, NEW_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_TOKEN_MESSAGE);
    expect(postBodiesTo(RESET_ROUTE)).toEqual([{ token, newPassword: NEW_PASSWORD }]);
    expect(storedUser().password).toBe(OLD_PASSWORD);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
