package com.uefs.tfs.avaliasystem.US06.e2e;

import com.uefs.tfs.avaliasystem.US03.e2e.TestAuthenticationConfig;
import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.dto.GroupResponse;
import com.uefs.tfs.avaliasystem.dto.StudentResponse;
import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

// LEVEL: E2E (top of the pyramid - few, slow, expensive tests).
// Unlike GroupIntegrationTest (MockMvc, still inside the test JVM), a real Servlet server is
// started on a random port and called over real HTTP with TestRestTemplate, exactly as an external
// client would. No layer is mocked; only the physical database is replaced by in-memory H2.
// Authentication is out of scope: the X-User-Id header is turned into the Principal by the
// test filter already provided for US03 (TestAuthenticationConfig).
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
@Import(TestAuthenticationConfig.class)
class GroupE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;

    private User tutor;
    private Room room;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);
        tutor = persistUser("E2E Tutor");
        room = persistRoom("E2E-GRP", "E2E Groups Room");
    }

    // No @Transactional here: the real server handles the request in another thread,
    // so a test transaction would not cover the HTTP call. Cleanup follows the FK order.
    @AfterEach
    void tearDown() {
        groupRepository.deleteAll();
        transactionTemplate.executeWithoutResult(status ->
                entityManager.createQuery("DELETE FROM RoomMember").executeUpdate());
        roomRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpEntity<Object> authenticatedRequest(Object body, String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);
        return new HttpEntity<>(body, headers);
    }

    // --- JOURNEY 1: the room Tutor creates, renames, composes and deletes a group ---

    @Test
    @DisplayName("[E2E][US06] Room Tutor creates, renames, adds and removes a student and deletes a group end to end")
    void tutorLifecycle_CreateRenameComposeDeleteGroup_WorksEndToEnd() {
        User student = persistUser("E2E Student");
        persistMember(room, student, true, null);

        // 1) Creation
        ResponseEntity<GroupResponse> createResponse = restTemplate.postForEntity(
                url("/api/v1/rooms/" + room.getId() + "/groups"),
                authenticatedRequest(new GroupRequest("Group 1"), tutor.getId()),
                GroupResponse.class);

        assertEquals(HttpStatus.CREATED, createResponse.getStatusCode());
        assertNotNull(createResponse.getBody());
        String groupId = createResponse.getBody().getId();
        assertEquals("Group 1", createResponse.getBody().getName());

        Group created = groupRepository.findById(groupId).orElseThrow();
        assertEquals(room.getId(), created.getRoom().getId());

        // 2) Rename
        ResponseEntity<GroupResponse> updateResponse = restTemplate.exchange(
                url("/api/v1/groups/" + groupId),
                HttpMethod.PUT,
                authenticatedRequest(new GroupRequest("Group 1 - Renamed"), tutor.getId()),
                GroupResponse.class);

        assertEquals(HttpStatus.OK, updateResponse.getStatusCode());
        assertNotNull(updateResponse.getBody());
        assertEquals("Group 1 - Renamed", updateResponse.getBody().getName());
        assertEquals("Group 1 - Renamed", groupRepository.findById(groupId).orElseThrow().getName());

        // 3) Adding a student of the room
        ResponseEntity<GroupResponse> addResponse = restTemplate.postForEntity(
                url("/api/v1/groups/" + groupId + "/members/" + student.getId()),
                authenticatedRequest(null, tutor.getId()),
                GroupResponse.class);

        assertEquals(HttpStatus.OK, addResponse.getStatusCode());
        assertNotNull(addResponse.getBody());
        assertEquals(Set.of(student.getId()), responseMemberIds(addResponse.getBody()));
        assertEquals(Set.of(student.getId()), memberIdsOf(groupId));

        // 4) Removing the student
        ResponseEntity<Void> removeResponse = restTemplate.exchange(
                url("/api/v1/groups/" + groupId + "/members/" + student.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, tutor.getId()),
                Void.class);

        assertEquals(HttpStatus.NO_CONTENT, removeResponse.getStatusCode());
        assertTrue(memberIdsOf(groupId).isEmpty());

        // 5) Deletion
        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                url("/api/v1/groups/" + groupId),
                HttpMethod.DELETE,
                authenticatedRequest(null, tutor.getId()),
                Void.class);

        assertEquals(HttpStatus.NO_CONTENT, deleteResponse.getStatusCode());
        assertTrue(groupRepository.findById(groupId).isEmpty());
    }

    // --- JOURNEY 2 (IDOR): only the Tutor of this specific room can manage its groups ---

    @Test
    @DisplayName("[E2E][US06] Tutor of another room cannot create, edit, compose or delete groups of this room")
    void idorJourney_TutorOfAnotherRoomCannotManageGroups() {
        User grouped = persistUser("E2E Grouped Student");
        User free = persistUser("E2E Free Student");
        persistMember(room, grouped, true, null);
        persistMember(room, free, true, null);
        Group group = persistGroup(room, "Protected Group", grouped);
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("E2E Intruder Tutor");
        persistRoom("E2E-INT", "Intruder Own Room", intruder);

        ResponseEntity<String> createAttempt = restTemplate.postForEntity(
                url("/api/v1/rooms/" + room.getId() + "/groups"),
                authenticatedRequest(new GroupRequest("Intruder Group"), intruder.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, createAttempt.getStatusCode());

        ResponseEntity<String> updateAttempt = restTemplate.exchange(
                url("/api/v1/groups/" + group.getId()),
                HttpMethod.PUT,
                authenticatedRequest(new GroupRequest("Hijacked Name"), intruder.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, updateAttempt.getStatusCode());

        ResponseEntity<String> addAttempt = restTemplate.postForEntity(
                url("/api/v1/groups/" + group.getId() + "/members/" + free.getId()),
                authenticatedRequest(null, intruder.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, addAttempt.getStatusCode());

        ResponseEntity<String> removeAttempt = restTemplate.exchange(
                url("/api/v1/groups/" + group.getId() + "/members/" + grouped.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, intruder.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, removeAttempt.getStatusCode());

        ResponseEntity<String> deleteAttempt = restTemplate.exchange(
                url("/api/v1/groups/" + group.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, intruder.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, deleteAttempt.getStatusCode());

        // Nothing changed in the database: no new group, original name kept, same members, row still there
        assertEquals(1, groupRepository.count());
        assertEquals("Protected Group", groupRepository.findById(group.getId()).orElseThrow().getName());
        assertEquals(Set.of(grouped.getId()), memberIdsOf(group.getId()));
    }

    // --- JOURNEY 3: an active student member of the room cannot manage its groups ---

    @Test
    @DisplayName("[E2E][US06] Active student member of the room gets 403 on every group management action; nothing changes")
    void studentJourney_ActiveStudentMemberCannotManageGroups() {
        User grouped = persistUser("E2E Grouped Student");
        persistMember(room, grouped, true, null);
        Group group = persistGroup(room, "Protected Group", grouped);
        // Belonging to the room is not enough: only its Tutor can manage groups
        User student = persistUser("E2E Member Student");
        persistMember(room, student, true, null);

        ResponseEntity<String> createAttempt = restTemplate.postForEntity(
                url("/api/v1/rooms/" + room.getId() + "/groups"),
                authenticatedRequest(new GroupRequest("Student Group"), student.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, createAttempt.getStatusCode());

        ResponseEntity<String> updateAttempt = restTemplate.exchange(
                url("/api/v1/groups/" + group.getId()),
                HttpMethod.PUT,
                authenticatedRequest(new GroupRequest("Hijacked Name"), student.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, updateAttempt.getStatusCode());

        // The student tries to put themself in the group
        ResponseEntity<String> addAttempt = restTemplate.postForEntity(
                url("/api/v1/groups/" + group.getId() + "/members/" + student.getId()),
                authenticatedRequest(null, student.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, addAttempt.getStatusCode());

        ResponseEntity<String> removeAttempt = restTemplate.exchange(
                url("/api/v1/groups/" + group.getId() + "/members/" + grouped.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, student.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, removeAttempt.getStatusCode());

        ResponseEntity<String> deleteAttempt = restTemplate.exchange(
                url("/api/v1/groups/" + group.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, student.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, deleteAttempt.getStatusCode());

        // Nothing changed in the database: no new group, original name kept, same members, row still there
        assertEquals(1, groupRepository.count());
        assertEquals("Protected Group", groupRepository.findById(group.getId()).orElseThrow().getName());
        assertEquals(Set.of(grouped.getId()), memberIdsOf(group.getId()));
    }

    // --- JOURNEY 4 (QA subtask): a student not enrolled in the room cannot join its groups ---

    @Test
    @DisplayName("[E2E][US06] Adding a student not enrolled in the room is blocked with 400; the group is unchanged")
    void qaJourney_StudentNotEnrolledInRoomCannotBeAddedToGroup() {
        Group group = persistGroup(room, "Group 1");
        // The student exists and is enrolled, but in another room: the link must be to this specific room
        User outsider = persistUser("E2E Outsider Student");
        Room otherRoom = persistRoom("E2E-OTH", "Other Room");
        persistMember(otherRoom, outsider, true, null);

        ResponseEntity<String> addAttempt = restTemplate.postForEntity(
                url("/api/v1/groups/" + group.getId() + "/members/" + outsider.getId()),
                authenticatedRequest(null, tutor.getId()),
                String.class);

        assertEquals(HttpStatus.BAD_REQUEST, addAttempt.getStatusCode());
        assertTrue(memberIdsOf(group.getId()).isEmpty());
    }

    // --- JOURNEY 5: composing groups only with available students of the room ---

    @Test
    @DisplayName("[E2E][US06] Available students shrink as groups are composed and a student cannot join a second group")
    void compositionJourney_AvailableStudentsAndOneGroupPerStudent() {
        User studentA = persistUser("E2E Student A");
        User studentB = persistUser("E2E Student B");
        User unlinked = persistUser("E2E Unlinked Student");
        User outsider = persistUser("E2E Outsider Student");
        persistMember(room, studentA, true, null);
        persistMember(room, studentB, true, null);
        persistMember(room, unlinked, false, Instant.parse("2026-03-01T10:00:00Z"));
        Room otherRoom = persistRoom("E2E-OTH", "Other Room");
        persistMember(otherRoom, outsider, true, null);
        Group firstGroup = persistGroup(room, "Group 1");
        Group secondGroup = persistGroup(room, "Group 2");

        // 1) Only active students linked to this room are offered
        assertEquals(Set.of(studentA.getId(), studentB.getId()), availableStudentIds());

        // 2) Student A joins the first group
        ResponseEntity<GroupResponse> addResponse = restTemplate.postForEntity(
                url("/api/v1/groups/" + firstGroup.getId() + "/members/" + studentA.getId()),
                authenticatedRequest(null, tutor.getId()),
                GroupResponse.class);
        assertEquals(HttpStatus.OK, addResponse.getStatusCode());

        // 3) Student A is no longer offered
        assertEquals(Set.of(studentB.getId()), availableStudentIds());

        // 4) Student A cannot join a second group of the same room
        ResponseEntity<String> secondAddAttempt = restTemplate.postForEntity(
                url("/api/v1/groups/" + secondGroup.getId() + "/members/" + studentA.getId()),
                authenticatedRequest(null, tutor.getId()),
                String.class);
        assertEquals(HttpStatus.BAD_REQUEST, secondAddAttempt.getStatusCode());

        assertEquals(Set.of(studentA.getId()), memberIdsOf(firstGroup.getId()));
        assertTrue(memberIdsOf(secondGroup.getId()).isEmpty());

        // 5) Once removed from the first group, student A is offered again
        ResponseEntity<Void> removeResponse = restTemplate.exchange(
                url("/api/v1/groups/" + firstGroup.getId() + "/members/" + studentA.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, tutor.getId()),
                Void.class);
        assertEquals(HttpStatus.NO_CONTENT, removeResponse.getStatusCode());

        assertEquals(Set.of(studentA.getId(), studentB.getId()), availableStudentIds());
    }

    // --- JOURNEY 6: the student sees who the other members of their group are ---

    @Test
    @DisplayName("[E2E][US06] Student sees the peer the Tutor added to their group and not those of other groups")
    void studentViewJourney_StudentSeesOwnGroupMembers() {
        User studentA = persistUser("E2E Student A");
        User studentB = persistUser("E2E Student B");
        User studentC = persistUser("E2E Student C");
        persistMember(room, studentA, true, null);
        persistMember(room, studentB, true, null);
        persistMember(room, studentC, true, null);
        Group ownGroup = persistGroup(room, "Group 1", studentA);
        persistGroup(room, "Group 2", studentC);

        // 1) The Tutor puts student B in the group of student A
        ResponseEntity<GroupResponse> addResponse = restTemplate.postForEntity(
                url("/api/v1/groups/" + ownGroup.getId() + "/members/" + studentB.getId()),
                authenticatedRequest(null, tutor.getId()),
                GroupResponse.class);
        assertEquals(HttpStatus.OK, addResponse.getStatusCode());

        // 2) Student A sees the new peer
        ResponseEntity<GroupResponse> response = restTemplate.exchange(
                url("/api/v1/rooms/" + room.getId() + "/groups/me"),
                HttpMethod.GET,
                authenticatedRequest(null, studentA.getId()),
                GroupResponse.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(ownGroup.getId(), response.getBody().getId());
        assertEquals("Group 1", response.getBody().getName());
        assertEquals(Set.of(studentA.getId(), studentB.getId()), responseMemberIds(response.getBody()));
    }

    // Helpers

    private Set<String> availableStudentIds() {
        ResponseEntity<StudentResponse[]> response = restTemplate.exchange(
                url("/api/v1/rooms/" + room.getId() + "/groups/available-students"),
                HttpMethod.GET,
                authenticatedRequest(null, tutor.getId()),
                StudentResponse[].class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        return Arrays.stream(response.getBody()).map(StudentResponse::getId).collect(Collectors.toSet());
    }

    private Set<String> responseMemberIds(GroupResponse response) {
        return response.getMembers().stream().map(StudentResponse::getId).collect(Collectors.toSet());
    }

    // Members are loaded lazily, so they must be read inside a transaction
    private Set<String> memberIdsOf(String groupId) {
        return transactionTemplate.execute(status ->
                groupRepository.findById(groupId).orElseThrow().getMembers().stream()
                        .map(User::getId).collect(Collectors.toSet()));
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        return userRepository.save(user);
    }

    private Room persistRoom(String code, String name) {
        return persistRoom(code, name, tutor);
    }

    private Room persistRoom(String code, String name, User owner) {
        Room newRoom = new Room();
        newRoom.setName(name);
        newRoom.setAccessCode(code);
        newRoom.setInviteLink("app/join/" + code);
        newRoom.setTutor(owner);
        return roomRepository.save(newRoom);
    }

    private Group persistGroup(Room targetRoom, String name, User... members) {
        Group group = new Group();
        group.setName(name);
        group.setRoom(targetRoom);
        group.getMembers().addAll(Arrays.asList(members));
        return groupRepository.save(group);
    }

    private void persistMember(Room targetRoom, User user, boolean active, Instant unlinkedAt) {
        RoomMember member = new RoomMember();
        member.setRoom(targetRoom);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        member.setUnlinkedAt(unlinkedAt);
        transactionTemplate.executeWithoutResult(status -> {
            entityManager.persist(member);
            entityManager.flush();
        });
    }
}
