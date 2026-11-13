import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProblemsPage } from "@/components/features/problems/ProblemsPage";
import type { Problem } from "@/types/problem";
import {
  FORBIDDEN_MESSAGE,
  makeOtherProblem,
  makeProblem,
  PROBLEM_ID,
  ROOM_ID,
  TITLE_VALIDATION_MESSAGE,
} from "../fixtures";

const ROOM_PROBLEMS_ROUTE = new RegExp(`/api/v1/rooms/${ROOM_ID}/problems$`);

let problems: Problem[];
let requesterIsRoomTutor: boolean;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const method = init.method ?? "GET";
  const id = url.match(/\/api\/v1\/problems\/([^/]+)$/)?.[1];

  if (method === "GET" && ROOM_PROBLEMS_ROUTE.test(url)) {
    return jsonResponse(problems, 200);
  }
  // Mesma regra do backend: só o Tutor da sala cria, edita ou exclui
  if (!requesterIsRoomTutor) {
    return new Response(null, { status: 403 });
  }
  if (method === "POST" && ROOM_PROBLEMS_ROUTE.test(url)) {
    const { title } = JSON.parse(String(init.body));
    const created = { id: "new-problem-id", title };
    problems = [...problems, created];
    return jsonResponse(created, 201);
  }
  if (method === "PUT" && id) {
    const { title } = JSON.parse(String(init.body));
    problems = problems.map((problem) => (problem.id === id ? { ...problem, title } : problem));
    return jsonResponse(problems.find((problem) => problem.id === id), 200);
  }
  if (method === "DELETE" && id) {
    problems = problems.filter((problem) => problem.id !== id);
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

function problemItems() {
  return screen.getAllByRole("listitem");
}

async function renderPage() {
  const user = userEvent.setup();
  render(<ProblemsPage roomId={ROOM_ID} />);
  await screen.findByText(makeOtherProblem().title);
  return { user };
}

beforeEach(() => {
  problems = [makeProblem(), makeOtherProblem()];
  requesterIsRoomTutor = true;
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US05] Problems page integration", () => {
  it("should GET the room's problems from the backend and list them in the API order", async () => {
    await renderPage();

    expect(requestsWithMethod("GET")[0].url).toMatch(ROOM_PROBLEMS_ROUTE);
    const items = problemItems();
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText(makeProblem().title)).toBeInTheDocument();
    expect(within(items[1]).getByText(makeOtherProblem().title)).toBeInTheDocument();
  });

  it("should POST the typed title to the room's route and show the new problem at the end of the list", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("button", { name: /criar novo problema/i }));
    await user.type(screen.getByLabelText(/título/i), "Problem 3");
    await user.click(screen.getByRole("button", { name: /^criar$/i }));

    expect(await screen.findByText("Problem 3")).toBeInTheDocument();
    expect(within(problemItems()[2]).getByText("Problem 3")).toBeInTheDocument();
    const posts = requestsWithMethod("POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toMatch(ROOM_PROBLEMS_ROUTE);
    expect(posts[0].body).toEqual({ title: "Problem 3" });
  });

  it("should block creation with a blank title without calling the backend", async () => {
    const { user } = await renderPage();

    await user.click(screen.getByRole("button", { name: /criar novo problema/i }));
    await user.type(screen.getByLabelText(/título/i), "   ");
    await user.click(screen.getByRole("button", { name: /^criar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(TITLE_VALIDATION_MESSAGE);
    expect(requestsWithMethod("POST")).toHaveLength(0);
  });

  it("should PUT the new title to the problem's route and keep the problem in its position", async () => {
    const { user } = await renderPage();

    await user.click(within(problemItems()[0]).getByRole("button", { name: /editar/i }));
    const titleInput = screen.getByLabelText(/título/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Problem 1 - Revised");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Problem 1 - Revised")).toBeInTheDocument();
    expect(within(problemItems()[0]).getByText("Problem 1 - Revised")).toBeInTheDocument();
    const puts = requestsWithMethod("PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0].url).toMatch(new RegExp(`/api/v1/problems/${PROBLEM_ID}$`));
    expect(puts[0].body).toEqual({ title: "Problem 1 - Revised" });
  });

  it("should DELETE the problem's route and remove it from the list", async () => {
    const { user } = await renderPage();

    await user.click(within(problemItems()[0]).getByRole("button", { name: /excluir/i }));

    await waitFor(() => expect(screen.queryByText(makeProblem().title)).not.toBeInTheDocument());
    expect(problemItems()).toHaveLength(1);
    const deletes = requestsWithMethod("DELETE");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].url).toMatch(new RegExp(`/api/v1/problems/${PROBLEM_ID}$`));
  });

  it("[QA] should show the forbidden message and keep the title when the backend answers the PUT with 403", async () => {
    requesterIsRoomTutor = false;
    const { user } = await renderPage();

    await user.click(within(problemItems()[0]).getByRole("button", { name: /editar/i }));
    const titleInput = screen.getByLabelText(/título/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Hijacked Title");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(FORBIDDEN_MESSAGE);
    expect(requestsWithMethod("PUT")).toHaveLength(1);
    expect(within(problemItems()[0]).getByText(makeProblem().title)).toBeInTheDocument();
  });
});
