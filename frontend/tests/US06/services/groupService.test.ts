import { beforeEach, describe, expect, it, vi } from "vitest";
import { groupService } from "@/services/groupService";
import {
  GROUP_ID,
  makeGroup,
  makeStudent,
  NOT_ENROLLED_STUDENT_ID,
  ROOM_ID,
  STUDENT_ID,
} from "../fixtures";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function singleFetchCall() {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), init: init ?? {} };
}

function sentBody(init: RequestInit): unknown {
  return JSON.parse(String(init.body));
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("[US06] groupService", () => {
  it("fetchGroups should GET the room's groups with their members", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([makeGroup()], 200));

    const groups = await groupService.fetchGroups(ROOM_ID);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/groups$`));
    expect(init.method ?? "GET").toBe("GET");
    expect(groups).toEqual([makeGroup()]);
  });

  it("createGroup should POST only the name to the room's groups route", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makeGroup({ members: [] }), 201));

    await expect(groupService.createGroup(ROOM_ID, "Group 1")).resolves.toBeUndefined();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/groups$`));
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ name: "Group 1" });
  });

  it("updateGroup should PUT the new name to the group's route", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makeGroup({ name: "Updated Group" }), 200));

    await expect(groupService.updateGroup(GROUP_ID, "Updated Group")).resolves.toBeUndefined();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/groups/${GROUP_ID}$`));
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ name: "Updated Group" });
  });

  it("deleteGroup should DELETE the group's route and resolve on 204", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(groupService.deleteGroup(GROUP_ID)).resolves.toBeUndefined();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/groups/${GROUP_ID}$`));
    expect(init.method).toBe("DELETE");
  });

  it("fetchAvailableStudents should GET the room's students available for grouping", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([makeStudent()], 200));

    const students = await groupService.fetchAvailableStudents(ROOM_ID);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/groups/available-students$`));
    expect(init.method ?? "GET").toBe("GET");
    expect(students).toEqual([makeStudent()]);
  });

  it("addMember should POST the student id to the group's members route", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makeGroup(), 201));

    await expect(groupService.addMember(GROUP_ID, STUDENT_ID)).resolves.toBeUndefined();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/groups/${GROUP_ID}/members$`));
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toMatch(/application\/json/);
    expect(sentBody(init)).toEqual({ studentId: STUDENT_ID });
  });

  it("[QA] addMember should reject when the backend refuses a student not enrolled in the room", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Student is not enrolled in this room." }, 400));

    await expect(groupService.addMember(GROUP_ID, NOT_ENROLLED_STUDENT_ID)).rejects.toThrow();

    const { url } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/groups/${GROUP_ID}/members$`));
  });

  it("removeMember should DELETE the student from the group's members route and resolve on 204", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(groupService.removeMember(GROUP_ID, STUDENT_ID)).resolves.toBeUndefined();

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/groups/${GROUP_ID}/members/${STUDENT_ID}$`));
    expect(init.method).toBe("DELETE");
  });

  it("fetchMyGroup should GET the logged student's group in the room", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(makeGroup(), 200));

    const group = await groupService.fetchMyGroup(ROOM_ID);

    const { url, init } = singleFetchCall();
    expect(url).toMatch(new RegExp(`/api/v1/rooms/${ROOM_ID}/groups/me$`));
    expect(init.method ?? "GET").toBe("GET");
    expect(group).toEqual(makeGroup());
  });
});
