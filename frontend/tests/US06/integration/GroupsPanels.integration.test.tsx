import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TutorGroupsPanel } from "@/components/features/groups/TutorGroupsPanel";
import { StudentGroupPanel } from "@/components/features/groups/StudentGroupPanel";
import type { Group, Student } from "@/types/group";
import {
  ADD_MEMBER_ERROR_MESSAGE,
  GROUP_ID,
  makeGroup,
  makeOtherGroup,
  makeOtherStudent,
  makeStudent,
  NOT_ENROLLED_STUDENT_ID,
  OTHER_GROUP_ID,
  OTHER_STUDENT_ID,
  ROOM_ID,
  STUDENT_ID,
} from "../fixtures";

const notEnrolledStudent: Student = { id: NOT_ENROLLED_STUDENT_ID, name: "Carlos Dias" };

let groups: Group[];
let availableStudents: Student[];
let enrolledStudents: Student[];

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fakeBackend(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = String(input);
  const method = init.method ?? "GET";
  const body = init.body ? JSON.parse(String(init.body)) : undefined;
  const memberRoute = url.match(/\/api\/v1\/groups\/([^/]+)\/members(?:\/([^/]+))?$/);
  const groupId = url.match(/\/api\/v1\/groups\/([^/]+)$/)?.[1];

  if (method === "GET" && url.endsWith(`/api/v1/rooms/${ROOM_ID}/groups`)) {
    return jsonResponse(groups, 200);
  }
  if (method === "GET" && url.endsWith(`/api/v1/rooms/${ROOM_ID}/groups/available-students`)) {
    return jsonResponse(availableStudents, 200);
  }
  if (method === "GET" && url.endsWith(`/api/v1/rooms/${ROOM_ID}/groups/me`)) {
    return jsonResponse(groups.find((group) => group.members.some((member) => member.id === STUDENT_ID)), 200);
  }
  if (method === "POST" && url.endsWith(`/api/v1/rooms/${ROOM_ID}/groups`)) {
    const created: Group = { id: "new-group-id", name: body.name, members: [] };
    groups = [...groups, created];
    return jsonResponse(created, 201);
  }
  if (method === "PUT" && groupId) {
    groups = groups.map((group) => (group.id === groupId ? { ...group, name: body.name } : group));
    return jsonResponse(groups.find((group) => group.id === groupId), 200);
  }
  if (method === "DELETE" && groupId) {
    const removed = groups.find((group) => group.id === groupId)!;
    groups = groups.filter((group) => group.id !== groupId);
    availableStudents = [...availableStudents, ...removed.members];
    return new Response(null, { status: 204 });
  }
  if (method === "POST" && memberRoute) {
    const student = enrolledStudents.find((enrolled) => enrolled.id === body.studentId);
    if (!student) {
      return jsonResponse({ message: "Student is not enrolled in this room." }, 400);
    }
    groups = groups.map((group) =>
      group.id === memberRoute[1] ? { ...group, members: [...group.members, student] } : group,
    );
    availableStudents = availableStudents.filter((available) => available.id !== student.id);
    return jsonResponse(groups.find((group) => group.id === memberRoute[1]), 201);
  }
  if (method === "DELETE" && memberRoute?.[2]) {
    const student = enrolledStudents.find((enrolled) => enrolled.id === memberRoute[2])!;
    groups = groups.map((group) =>
      group.id === memberRoute[1]
        ? { ...group, members: group.members.filter((member) => member.id !== student.id) }
        : group,
    );
    availableStudents = [...availableStudents, student];
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

function groupCard(name: string) {
  return within(screen.getByRole("region", { name }));
}

async function renderTutorPanel() {
  const user = userEvent.setup();
  render(<TutorGroupsPanel roomId={ROOM_ID} />);
  await screen.findByRole("region", { name: makeGroup().name });
  return { user };
}

beforeEach(() => {
  groups = [makeGroup(), makeOtherGroup()];
  availableStudents = [makeOtherStudent()];
  enrolledStudents = [makeStudent(), makeOtherStudent()];
  vi.stubGlobal("fetch", vi.fn(fakeBackend));
});

describe("[US06] Tutor groups panel integration", () => {
  it("should GET the room's groups and available students and list each group with its members", async () => {
    await renderTutorPanel();

    const gets = requestsWithMethod("GET").map((request) => request.url);
    expect(gets).toEqual(
      expect.arrayContaining([
        expect.stringMatching(new RegExp(`/api/v1/rooms/${ROOM_ID}/groups$`)),
        expect.stringMatching(new RegExp(`/api/v1/rooms/${ROOM_ID}/groups/available-students$`)),
      ]),
    );
    expect(groupCard(makeGroup().name).getByText(makeStudent().name)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: makeOtherGroup().name })).toBeInTheDocument();
  });

  it("should POST the typed name to the room's groups route and show the new group", async () => {
    const { user } = await renderTutorPanel();

    await user.click(screen.getByRole("button", { name: /criar grupo/i }));
    await user.type(screen.getByLabelText(/nome do grupo/i), "Group 3");
    await user.click(screen.getByRole("button", { name: /^criar$/i }));

    expect(await screen.findByRole("region", { name: "Group 3" })).toBeInTheDocument();
    const posts = requestsWithMethod("POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/groups$`));
    expect(posts[0].body).toEqual({ name: "Group 3" });
  });

  it("should PUT the new name to the group's route and show it", async () => {
    const { user } = await renderTutorPanel();

    await user.click(groupCard(makeGroup().name).getByRole("button", { name: /editar/i }));
    const nameInput = screen.getByLabelText(/nome do grupo/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Group");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByRole("region", { name: "Updated Group" })).toBeInTheDocument();
    const puts = requestsWithMethod("PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0].url).toMatch(new RegExp(`/api/v1/groups/${GROUP_ID}$`));
    expect(puts[0].body).toEqual({ name: "Updated Group" });
  });

  it("should DELETE the group's route, remove it and offer its members again for grouping", async () => {
    const { user } = await renderTutorPanel();

    await user.click(groupCard(makeGroup().name).getByRole("button", { name: /excluir/i }));

    await waitFor(() => expect(screen.queryByRole("region", { name: makeGroup().name })).not.toBeInTheDocument());
    const deletes = requestsWithMethod("DELETE");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].url).toMatch(new RegExp(`/api/v1/groups/${GROUP_ID}$`));

    await user.click(groupCard(makeOtherGroup().name).getByRole("button", { name: /adicionar aluno/i }));
    expect(screen.getByRole("radio", { name: makeStudent().name })).toBeInTheDocument();
  });

  it("should offer only available students, POST the chosen one and stop offering it to other groups", async () => {
    const { user } = await renderTutorPanel();

    await user.click(groupCard(makeOtherGroup().name).getByRole("button", { name: /adicionar aluno/i }));
    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(1);
    await user.click(screen.getByRole("radio", { name: makeOtherStudent().name }));
    await user.click(screen.getByRole("button", { name: /^adicionar$/i }));

    expect(await groupCard(makeOtherGroup().name).findByText(makeOtherStudent().name)).toBeInTheDocument();
    const posts = requestsWithMethod("POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toMatch(new RegExp(`/api/v1/groups/${OTHER_GROUP_ID}/members$`));
    expect(posts[0].body).toEqual({ studentId: OTHER_STUDENT_ID });

    await user.click(groupCard(makeGroup().name).getByRole("button", { name: /adicionar aluno/i }));
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("[QA] should show an alert and keep the group unchanged when the backend refuses a student not enrolled in the room", async () => {
    availableStudents = [notEnrolledStudent];
    const { user } = await renderTutorPanel();

    await user.click(groupCard(makeOtherGroup().name).getByRole("button", { name: /adicionar aluno/i }));
    await user.click(screen.getByRole("radio", { name: notEnrolledStudent.name }));
    await user.click(screen.getByRole("button", { name: /^adicionar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ADD_MEMBER_ERROR_MESSAGE);
    const posts = requestsWithMethod("POST");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toMatch(new RegExp(`/api/v1/groups/${OTHER_GROUP_ID}/members$`));
    expect(posts[0].body).toEqual({ studentId: NOT_ENROLLED_STUDENT_ID });
    expect(groupCard(makeOtherGroup().name).queryByText(notEnrolledStudent.name)).not.toBeInTheDocument();
  });

  it("should DELETE the student from the group's members route and offer it again for grouping", async () => {
    const { user } = await renderTutorPanel();

    await user.click(groupCard(makeGroup().name).getByRole("button", { name: /remover alice souza/i }));

    await waitFor(() =>
      expect(groupCard(makeGroup().name).queryByText(makeStudent().name)).not.toBeInTheDocument(),
    );
    const deletes = requestsWithMethod("DELETE");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].url).toMatch(new RegExp(`/api/v1/groups/${GROUP_ID}/members/${STUDENT_ID}$`));

    await user.click(groupCard(makeOtherGroup().name).getByRole("button", { name: /adicionar aluno/i }));
    expect(screen.getByRole("radio", { name: makeStudent().name })).toBeInTheDocument();
  });
});

describe("[US06] Student group panel integration", () => {
  it("should GET the student's own group and show all its members without management actions", async () => {
    groups = [makeGroup({ members: [makeStudent(), makeOtherStudent()] })];
    render(<StudentGroupPanel roomId={ROOM_ID} />);

    const card = within(await screen.findByRole("region", { name: makeGroup().name }));
    expect(card.getByText(makeStudent().name)).toBeInTheDocument();
    expect(card.getByText(makeOtherStudent().name)).toBeInTheDocument();
    expect(requestsWithMethod("GET")[0].url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/groups/me$`));
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
