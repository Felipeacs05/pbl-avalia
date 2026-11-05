// src/services/authFetch.ts

/**
 * Retorna os headers com Authorization: Bearer <token> injetado
 * caso o token esteja presente no localStorage.
 */
export function getAuthHeaders(customHeaders?: HeadersInit): Headers {
  const headers = new Headers(customHeaders);
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return headers;
}

/**
 * Wrapper sobre o fetch nativo que injeta automaticamente o cabeçalho Authorization
 * com o Bearer token armazenado no localStorage.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = getAuthHeaders(init?.headers);
  return fetch(input, {
    ...init,
    headers,
  });
}

/**
 * Extrai dados úteis do usuário logado diretamente das claims do JWT ou do localStorage.
 */
export function getLoggedUserProfile(): { id?: string; name?: string; email?: string } | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  let parsedStored: { id?: string; name?: string; email?: string } = {};
  if (storedUser) {
    try {
      parsedStored = JSON.parse(storedUser);
    } catch {}
  }

  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        const res: { id?: string; name?: string; email?: string } = {};
        if (payload.sub || parsedStored.id) res.id = payload.sub || parsedStored.id;
        if (payload.name || parsedStored.name) res.name = payload.name || parsedStored.name;
        if (payload.email || parsedStored.email) res.email = payload.email || parsedStored.email;
        if (Object.keys(res).length > 0) return res;
      }
    } catch {
      // Ignora erro de parse
    }
  }

  if (parsedStored.id || parsedStored.name || parsedStored.email) {
    return parsedStored;
  }
  return null;
}

export function getLoggedUser(): { id?: string } | null {
  const profile = getLoggedUserProfile();
  if (profile && profile.id) {
    return { id: profile.id };
  }
  return null;
}

