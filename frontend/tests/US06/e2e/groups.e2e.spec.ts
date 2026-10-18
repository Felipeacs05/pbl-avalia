import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ROOM_ID = process.env.E2E_ROOM_ID!;
const TUTOR_ID = process.env.E2E_TUTOR_ID!;
const STUDENT_ID = process.env.E2E_STUDENT_ID!;

const GROUPS_PAGE = `/rooms/${ROOM_ID}/groups`;
const ADD_MEMBER_ERROR_MESSAGE = /não foi possível adicionar o aluno/i;
const ROOM_GROUPS_ROUTE = new RegExp(`/api/v1/rooms/${ROOM_ID}/groups$`);
const AVAILABLE_STUDENTS_ROUTE = new RegExp(`/api/v1/rooms/${ROOM_ID}/groups/available-students$`);
const GROUP_ROUTE = /\/api\/v1\/groups\/[^/?#]+$/;
const MEMBERS_ROUTE = /\/api\/v1\/groups\/[^/?#]+\/members(\/[^/?#]+)?$/;

type Student = { id: string; name: string };
type Group = { id: string; name: string; members: Student[] };

let createdGroupIds: string[] = [];

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

function asTutor() {
  return { "X-User-Id": TUTOR_ID };
}

function groupCard(page: Page, name: string) {
  return page.getByRole("region", { name });
}

async function apiCreateGroup(request: APIRequestContext, name: string): Promise<Group> {
  const response = await request.post(`/api/v1/rooms/${ROOM_ID}/groups`, { headers: asTutor(), data: { name } });
  expect(response.status()).toBe(201);
  const group: Group = await response.json();
  createdGroupIds.push(group.id);
  return group;
}

async function apiAvailableStudents(request: APIRequestContext): Promise<Student[]> {
  const response = await request.get(`/api/v1/rooms/${ROOM_ID}/groups/available-students`, { headers: asTutor() });
  expect(response.ok()).toBe(true);
  return response.json();
}

async function apiGroups(request: APIRequestContext): Promise<Group[]> {
  const response = await request.get(`/api/v1/rooms/${ROOM_ID}/groups`, { headers: asTutor() });
  expect(response.ok()).toBe(true);
  return response.json();
}

async function apiAddMember(request: APIRequestContext, groupId: string, studentId: string) {
  const response = await request.post(`/api/v1/groups/${groupId}/members`, {
    headers: asTutor(),
    data: { studentId },
  });
  expect(response.ok()).toBe(true);
}

test.afterEach(async ({ request }) => {
  for (const groupId of createdGroupIds) {
    await request.delete(`/api/v1/groups/${groupId}`, { headers: asTutor() });
  }
  createdGroupIds = [];
});

test.describe("Tutor", () => {
  test.use({ extraHTTPHeaders: asTutor() });

  test("[E2E][US06] Tutor creates a group, adds and removes a student, renames and deletes the group", async ({
    page,
    request,
  }) => {
    const name = uniqueName("E2E Group");
    const renamed = `${name} Renamed`;
    const [student] = await apiAvailableStudents(request);
    expect(student).toBeDefined();
    await page.goto(GROUPS_PAGE);

    await page.getByRole("button", { name: /criar grupo/i }).click();
    await page.getByLabel(/nome do grupo/i).fill(name);
    const [createResponse] = await Promise.all([
      page.waitForResponse((res) => res.request().method() === "POST" && ROOM_GROUPS_ROUTE.test(res.url())),
      page.getByRole("button", { name: /^criar$/i }).click(),
    ]);
    expect(createResponse.request().postDataJSON()).toEqual({ name });
    const groupId = ((await createResponse.json()) as Group).id;
    createdGroupIds.push(groupId);
    await expect(groupCard(page, name)).toBeVisible();

    await groupCard(page, name).getByRole("button", { name: /adicionar aluno/i }).click();
    await page.getByRole("radio", { name: student.name }).check();
    const [addRequest] = await Promise.all([
      page.waitForRequest((req) => req.method() === "POST" && MEMBERS_ROUTE.test(req.url())),
      page.getByRole("button", { name: /^adicionar$/i }).click(),
    ]);
    expect(addRequest.url()).toMatch(new RegExp(`/api/v1/groups/${groupId}/members$`));
    expect(addRequest.postDataJSON()).toEqual({ studentId: student.id });
    await expect(groupCard(page, name).getByText(student.name)).toBeVisible();

    await page.reload();
    await expect(groupCard(page, name).getByText(student.name)).toBeVisible();
    await groupCard(page, name).getByRole("button", { name: /adicionar aluno/i }).click();
    await expect(page.getByRole("radio", { name: student.name })).toHaveCount(0);
    await page.reload();

    const [removeRequest] = await Promise.all([
      page.waitForRequest((req) => req.method() === "DELETE" && MEMBERS_ROUTE.test(req.url())),
      groupCard(page, name).getByRole("button", { name: new RegExp(`remover ${student.name}`, "i") }).click(),
    ]);
    expect(removeRequest.url()).toMatch(new RegExp(`/api/v1/groups/${groupId}/members/${student.id}$`));
    await expect(groupCard(page, name).getByText(student.name)).toHaveCount(0);

    await groupCard(page, name).getByRole("button", { name: /editar/i }).click();
    await page.getByLabel(/nome do grupo/i).fill(renamed);
    const [putRequest] = await Promise.all([
      page.waitForRequest((req) => req.method() === "PUT" && GROUP_ROUTE.test(req.url())),
      page.getByRole("button", { name: /salvar/i }).click(),
    ]);
    expect(putRequest.url()).toMatch(new RegExp(`/api/v1/groups/${groupId}$`));
    expect(putRequest.postDataJSON()).toEqual({ name: renamed });
    await expect(groupCard(page, renamed)).toBeVisible();

    const [deleteRequest] = await Promise.all([
      page.waitForRequest((req) => req.method() === "DELETE" && GROUP_ROUTE.test(req.url())),
      groupCard(page, renamed).getByRole("button", { name: /excluir/i }).click(),
    ]);
    expect(deleteRequest.url()).toBe(putRequest.url());
    await expect(groupCard(page, renamed)).toHaveCount(0);

    await page.reload();
    await expect(groupCard(page, renamed)).toHaveCount(0);
  });

  test("[E2E][US06][QA] Adding a student not enrolled in the room is refused and the group stays unchanged", async ({
    page,
    request,
  }) => {
    const group = await apiCreateGroup(request, uniqueName("E2E QA Group"));
    const notEnrolledStudent: Student = { id: randomUUID(), name: "Not Enrolled Student" };
    // A interface só oferece alunos já vinculados; o aluno externo é injetado na resposta para exercitar o bloqueio do backend
    await page.route(AVAILABLE_STUDENTS_ROUTE, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: [...(await response.json()), notEnrolledStudent] });
    });
    await page.goto(GROUPS_PAGE);

    await groupCard(page, group.name).getByRole("button", { name: /adicionar aluno/i }).click();
    await page.getByRole("radio", { name: notEnrolledStudent.name }).check();
    const [addResponse] = await Promise.all([
      page.waitForResponse((res) => res.request().method() === "POST" && MEMBERS_ROUTE.test(res.url())),
      page.getByRole("button", { name: /^adicionar$/i }).click(),
    ]);

    expect(addResponse.request().postDataJSON()).toEqual({ studentId: notEnrolledStudent.id });
    expect(addResponse.status()).toBeGreaterThanOrEqual(400);
    expect(addResponse.status()).toBeLessThan(500);
    // O filtro evita colidir com o anunciador de rotas do Next, que também usa role="alert"
    await expect(page.getByRole("alert").filter({ hasText: ADD_MEMBER_ERROR_MESSAGE })).toBeVisible();
    const persisted = (await apiGroups(request)).find((candidate) => candidate.id === group.id)!;
    expect(persisted.members).toEqual([]);
  });
});

test.describe("Student", () => {
  test.use({ extraHTTPHeaders: { "X-User-Id": STUDENT_ID } });

  test("[E2E][US06] Student sees the other members of their own group without management actions", async ({
    page,
    request,
  }) => {
    const group = await apiCreateGroup(request, uniqueName("E2E Student Group"));
    const classmate = (await apiAvailableStudents(request)).find((student) => student.id !== STUDENT_ID)!;
    expect(classmate).toBeDefined();
    await apiAddMember(request, group.id, STUDENT_ID);
    await apiAddMember(request, group.id, classmate.id);

    await page.goto(GROUPS_PAGE);

    await expect(groupCard(page, group.name)).toBeVisible();
    await expect(groupCard(page, group.name).getByText(classmate.name)).toBeVisible();
    await expect(groupCard(page, group.name).getByRole("button")).toHaveCount(0);
  });
});
