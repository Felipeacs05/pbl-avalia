import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

import Home from "@/app/teacher-rooms/page";
import type { Room } from "@/types/room";
import { makeRoom, NAME_VALIDATION_MESSAGE, ROOM_ID } from "../fixtures";

let rooms: Room[];

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const method = init.method ?? "GET";
  const id = url.match(/\/api\/v1\/rooms\/([^/]+)$/)?.[1];

  if (method === "GET") {
    return jsonResponse(rooms, 200);
  }
  if (method === "POST") {
    const { name } = JSON.parse(String(init.body));
    const code = "N3W01";
    rooms = [...rooms, { id: "new-room-id", name, code, joinLink: `app/join/${code}` }];
    return jsonResponse({ code, joinLink: `app/join/${code}` }, 201);
  }
  if (method === "PUT" && id) {
    const { name } = JSON.parse(String(init.body));
    rooms = rooms.map((room) => (room.id === id ? { ...room, name } : room));
    const updated = rooms.find((room) => room.id === id)!;
    return jsonResponse({ code: updated.code, joinLink: updated.joinLink }, 200);
  }
  if (method === "DELETE" && id) {
    rooms = rooms.filter((room) => room.id !== id);
    return new Response(null, { status: 204 });
  }
  return jsonResponse({}, 404);
}

function requestsWithMethod(method: string) {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([url, init]) => ({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined }));
}

async function renderPage() {
  const user = userEvent.setup();
  render(<Home />);
  await screen.findByText(makeRoom().name);
  return { user };
}

beforeEach(() => {
  rooms = [makeRoom()];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US03] Rooms page integration", () => {
  it("should GET the rooms from the backend and list them", async () => {
    await renderPage();

    expect(requestsWithMethod("GET")[0].url).toMatch(/\/api\/v1\/rooms$/);
    expect(screen.getByText(makeRoom().name)).toBeInTheDocument();
  });

  it("should POST the typed name and show the new room in the list", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("button", { name: /criar nova sala/i }));
    await user.type(screen.getByLabelText(/nome da sala/i), "New Room");
    await user.click(screen.getByRole("button", { name: /^criar$/i }));

    expect(await screen.findByText("New Room")).toBeInTheDocument();
    const posts = requestsWithMethod("POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toMatch(/\/api\/v1\/rooms$/);
    expect(posts[0].body).toEqual({ name: "New Room" });
  });

  it("[QA] should block creation with fewer than 3 characters without calling the backend", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("button", { name: /criar nova sala/i }));
    await user.type(screen.getByLabelText(/nome da sala/i), "AB");
    await user.click(screen.getByRole("button", { name: /^criar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(NAME_VALIDATION_MESSAGE);
    expect(requestsWithMethod("POST")).toHaveLength(0);
  });

  it("should PUT the new name to the room's route and show it in the list", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("button", { name: /editar/i }));
    const nameInput = screen.getByLabelText(/nome da sala/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Module");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Updated Module")).toBeInTheDocument();
    const puts = requestsWithMethod("PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0].url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}$`));
    expect(puts[0].body).toEqual({ name: "Updated Module" });
  });

  it("should DELETE the room's route and remove it from the list", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("button", { name: /excluir/i }));

    await waitFor(() => expect(screen.queryByText(makeRoom().name)).not.toBeInTheDocument());
    const deletes = requestsWithMethod("DELETE");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}$`));
  });

  it("[QA] should copy the absolute join link and show a success toast", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("button", { name: /copiar link/i }));

    expect(await screen.findByText(/link copiado/i)).toBeVisible();
    // userEvent.setup() substitui o navigator.clipboard por um stub próprio; a URL é lida dele
    await expect(navigator.clipboard.readText()).resolves.toBe(`${window.location.origin}/app/join/A1B2C`);
  });
});
