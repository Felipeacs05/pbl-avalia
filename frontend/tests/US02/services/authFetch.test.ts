import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authFetch, getAuthHeaders, getLoggedUser } from "@/services/authFetch";

describe("authFetch & authHeaders", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    localStorage.clear();
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it("getAuthHeaders não adiciona Authorization se não houver token no localStorage", () => {
    const headers = getAuthHeaders({ "Content-Type": "application/json" });
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBeNull();
  });

  it("getAuthHeaders adiciona Authorization: Bearer <token> quando token existir", () => {
    localStorage.setItem("token", "fake-jwt-token-123");
    const headers = getAuthHeaders({ "Content-Type": "application/json" });
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer fake-jwt-token-123");
  });

  it("getAuthHeaders preserva Authorization customizado se já fornecido", () => {
    localStorage.setItem("token", "fake-jwt-token-123");
    const headers = getAuthHeaders({ Authorization: "CustomToken abc" });
    expect(headers.get("Authorization")).toBe("CustomToken abc");
  });

  it("authFetch delega para fetch injetando o header Authorization", async () => {
    localStorage.setItem("token", "fake-jwt-token-123");
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await authFetch("/api/v1/rooms", { method: "GET" });
    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/v1/rooms");
    expect(init?.method).toBe("GET");
    const sentHeaders = new Headers(init?.headers);
    expect(sentHeaders.get("Authorization")).toBe("Bearer fake-jwt-token-123");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("getLoggedUser decodifica o sub (ID do usuário) de um token JWT válido", () => {
    const payload = { sub: "12345678-1234-1234-1234-123456789abc", name: "User Test" };
    const fakeJwt = `header.${btoa(JSON.stringify(payload))}.signature`;
    localStorage.setItem("token", fakeJwt);

    const user = getLoggedUser();
    expect(user).toEqual({ id: "12345678-1234-1234-1234-123456789abc" });
  });

  it("getLoggedUser retorna null quando não há token ou token é inválido", () => {
    expect(getLoggedUser()).toBeNull();
    localStorage.setItem("token", "invalid-token");
    expect(getLoggedUser()).toBeNull();
  });
});

