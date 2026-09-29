package com.uefs.tfs.avaliasystem.US06;

import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.Instant;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// LEVEL: INTEGRATION (middle of the pyramid).
// Unlike GroupControllerTest (Service mocked) and GroupServiceTest (Repositories mocked),
// the whole Spring context is started here: real Controller, real Service and real Repository
// talking to H2 through MockMvc. Goal: catch "glue" bugs between layers that isolated tests
// cannot see (exception -> HTTP status mapping, real DTO serialization, one transaction across layers).
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
class GroupIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private User tutor;
    private Room room;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Integration Tutor");
        room = persistRoom("GRPI1", "Groups Integration Room");
    }

    // Authentication is out of scope: the authenticated user is injected directly as the Principal
    private RequestPostProcessor authenticatedAs(String userId) {
        return request -> {
            request.setUserPrincipal((Principal) () -> userId);
            return request;
        };
    }

    // --- CREATION THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US06] POST should cross Controller, Service and Repository and persist the group linked to the room")
    void createGroup_ThroughFullStack_PersistsGroupLinkedToRoom() throws Exception {
        GroupRequest request = new GroupRequest("Group 1");

        String responseBody = mockMvc.perform(post("/api/v1/rooms/{roomId}/groups", room.getId())
                        .with(authenticatedAs(tutor.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Group 1"))
                .andExpect(jsonPath("$.members.length()").value(0))
                .andReturn().getResponse().getContentAsString();

        String createdId = objectMapper.readTree(responseBody).get("id").asString();

        entityManager.flush();
        entityManager.clear();

        // Proof that the request went through all layers: the returned id is a real row in the database
        Group persisted = groupRepository.findById(createdId).orElseThrow();
        assertEquals("Group 1", persisted.getName());
        assertEquals(room.getId(), persisted.getRoom().getId());
        assertTrue(persisted.getMembers().isEmpty());
    }

    @Test
    @DisplayName("[US06] POST by the Tutor of another room should return 403 and persist nothing")
    void createGroup_ByTutorOfAnotherRoom_Returns403_AndPersistsNothing() throws Exception {
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("Intruder Tutor");
        persistRoom("GRPI2", "Intruder Own Room", intruder);
        GroupRequest request = new GroupRequest("Intruder Group");

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups", room.getId())
                        .with(authenticatedAs(intruder.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals(0, groupRepository.count());
    }

    @Test
    @DisplayName("[US06] POST by an active student member of the room should return 403 and persist nothing")
    void createGroup_ByActiveStudentMember_Returns403_AndPersistsNothing() throws Exception {
        // Belonging to the room is not enough: only its Tutor can create groups
        User student = persistUser("Member Student");
        persistMember(room, student, true, null);
        GroupRequest request = new GroupRequest("Student Group");

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups", room.getId())
                        .with(authenticatedAs(student.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals(0, groupRepository.count());
    }

    // --- UPDATE THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US06] PUT should persist the new name through all layers and keep the members")
    void updateGroup_ThroughFullStack_PersistsNewNameAndKeepsMembers() throws Exception {
        User student = persistUser("Grouped Student");
        persistMember(room, student, true, null);
        Group group = persistGroup(room, "Group 1", student);
        GroupRequest request = new GroupRequest("Group 1 - Renamed");

        // The members in the response must be loaded from the database, not from the persistence context
        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(put("/api/v1/groups/{id}", group.getId())
                        .with(authenticatedAs(tutor.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(group.getId()))
                .andExpect(jsonPath("$.name").value("Group 1 - Renamed"))
                .andExpect(jsonPath("$.members[0].id").value(student.getId()));

        entityManager.flush();
        entityManager.clear();

        Group reloaded = groupRepository.findById(group.getId()).orElseThrow();
        assertEquals("Group 1 - Renamed", reloaded.getName());
        assertEquals(Set.of(student.getId()), memberIds(reloaded));
    }

    @Test
    @DisplayName("[US06] PUT by the Tutor of another room should return 403 and not change the database")
    void updateGroup_ByTutorOfAnotherRoom_Returns403_AndDoesNotPersistChange() throws Exception {
        Group group = persistGroup(room, "Protected Group");
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("Intruder Tutor");
        persistRoom("GRPI5", "Intruder Own Room", intruder);
        GroupRequest request = new GroupRequest("Hijacked Name");

        mockMvc.perform(put("/api/v1/groups/{id}", group.getId())
                        .with(authenticatedAs(intruder.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals("Protected Group", groupRepository.findById(group.getId()).orElseThrow().getName());
    }

    @Test
    @DisplayName("[US06] PUT by an active student member of the room should return 403 and not change the database")
    void updateGroup_ByActiveStudentMember_Returns403_AndDoesNotPersistChange() throws Exception {
        Group group = persistGroup(room, "Protected Group");
        // Belonging to the room is not enough: only its Tutor can edit groups
        User student = persistUser("Member Student");
        persistMember(room, student, true, null);
        GroupRequest request = new GroupRequest("Hijacked Name");

        mockMvc.perform(put("/api/v1/groups/{id}", group.getId())
                        .with(authenticatedAs(student.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals("Protected Group", groupRepository.findById(group.getId()).orElseThrow().getName());
    }

    // --- DELETION THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US06] DELETE should remove the group row through all layers")
    void deleteGroup_ThroughFullStack_RemovesRowFromDatabase() throws Exception {
        User student = persistUser("Grouped Student");
        persistMember(room, student, true, null);
        Group group = persistGroup(room, "Group to Delete", student);

        mockMvc.perform(delete("/api/v1/groups/{id}", group.getId())
                        .with(authenticatedAs(tutor.getId())))
                .andExpect(status().isNoContent());

        // A group with members must be deletable: the membership rows cannot block the removal (FK)
        entityManager.flush();
        entityManager.clear();
        assertTrue(groupRepository.findById(group.getId()).isEmpty());
    }

    @Test
    @DisplayName("[US06] DELETE by the Tutor of another room should return 403 and keep the row in the database")
    void deleteGroup_ByTutorOfAnotherRoom_Returns403_AndKeepsRow() throws Exception {
        Group group = persistGroup(room, "Protected Group");
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("Intruder Tutor");
        persistRoom("GRPI6", "Intruder Own Room", intruder);

        mockMvc.perform(delete("/api/v1/groups/{id}", group.getId())
                        .with(authenticatedAs(intruder.getId())))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertTrue(groupRepository.findById(group.getId()).isPresent());
    }

    @Test
    @DisplayName("[US06] DELETE by an active student member of the room should return 403 and keep the row in the database")
    void deleteGroup_ByActiveStudentMember_Returns403_AndKeepsRow() throws Exception {
        Group group = persistGroup(room, "Protected Group");
        // Belonging to the room is not enough: only its Tutor can delete groups
        User student = persistUser("Member Student");
        persistMember(room, student, true, null);

        mockMvc.perform(delete("/api/v1/groups/{id}", group.getId())
                        .with(authenticatedAs(student.getId())))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertTrue(groupRepository.findById(group.getId()).isPresent());
    }

    // --- ADDING A STUDENT THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US06] POST member should persist a student of the room in the group through all layers")
    void addMember_WithStudentLinkedToRoom_PersistsMembership() throws Exception {
        User student = persistUser("Enrolled Student");
        persistMember(room, student, true, null);
        Group group = persistGroup(room, "Group 1");

        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(post("/api/v1/groups/{id}/members/{studentId}", group.getId(), student.getId())
                        .with(authenticatedAs(tutor.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(1))
                .andExpect(jsonPath("$.members[0].id").value(student.getId()))
                .andExpect(jsonPath("$.members[0].name").value("Enrolled Student"));

        entityManager.flush();
        entityManager.clear();
        assertEquals(Set.of(student.getId()), memberIds(groupRepository.findById(group.getId()).orElseThrow()));
    }

    @Test
    @DisplayName("[US06] POST member with a student not enrolled in the room should return 400 and persist nothing")
    void addMember_WithStudentNotEnrolledInRoom_Returns400_AndPersistsNothing() throws Exception {
        // The student exists and is enrolled, but in another room: the link must be to this specific room (QA subtask scenario)
        User outsider = persistUser("Outsider Student");
        Room otherRoom = persistRoom("GRPI3", "Other Room");
        persistMember(otherRoom, outsider, true, null);
        Group group = persistGroup(room, "Group 1");

        mockMvc.perform(post("/api/v1/groups/{id}/members/{studentId}", group.getId(), outsider.getId())
                        .with(authenticatedAs(tutor.getId())))
                .andExpect(status().isBadRequest());

        entityManager.flush();
        entityManager.clear();
        assertTrue(groupRepository.findById(group.getId()).orElseThrow().getMembers().isEmpty());
    }

    @Test
    @DisplayName("[US06] POST member with a student already in another group of the room should return 400 and not move them")
    void addMember_WithStudentAlreadyInAnotherGroupOfRoom_Returns400_AndKeepsOriginalGroup() throws Exception {
        User student = persistUser("Grouped Student");
        persistMember(room, student, true, null);
        Group originalGroup = persistGroup(room, "Group 1", student);
        Group targetGroup = persistGroup(room, "Group 2");

        mockMvc.perform(post("/api/v1/groups/{id}/members/{studentId}", targetGroup.getId(), student.getId())
                        .with(authenticatedAs(tutor.getId())))
                .andExpect(status().isBadRequest());

        entityManager.flush();
        entityManager.clear();
        assertEquals(Set.of(student.getId()), memberIds(groupRepository.findById(originalGroup.getId()).orElseThrow()));
        assertTrue(groupRepository.findById(targetGroup.getId()).orElseThrow().getMembers().isEmpty());
    }

    @Test
    @DisplayName("[US06] POST member by the Tutor of another room should return 403 and persist nothing")
    void addMember_ByTutorOfAnotherRoom_Returns403_AndPersistsNothing() throws Exception {
        User student = persistUser("Enrolled Student");
        persistMember(room, student, true, null);
        Group group = persistGroup(room, "Group 1");
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("Intruder Tutor");
        persistRoom("GRPI7", "Intruder Own Room", intruder);

        mockMvc.perform(post("/api/v1/groups/{id}/members/{studentId}", group.getId(), student.getId())
                        .with(authenticatedAs(intruder.getId())))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertTrue(groupRepository.findById(group.getId()).orElseThrow().getMembers().isEmpty());
    }

    @Test
    @DisplayName("[US06] POST member by an active student member of the room should return 403 and persist nothing")
    void addMember_ByActiveStudentMember_Returns403_AndPersistsNothing() throws Exception {
        // Belonging to the room is not enough: only its Tutor can compose groups
        User student = persistUser("Member Student");
        persistMember(room, student, true, null);
        Group group = persistGroup(room, "Group 1");

        mockMvc.perform(post("/api/v1/groups/{id}/members/{studentId}", group.getId(), student.getId())
                        .with(authenticatedAs(student.getId())))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertTrue(groupRepository.findById(group.getId()).orElseThrow().getMembers().isEmpty());
    }

    // --- REMOVING A STUDENT THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US06] DELETE member should remove only that student from the group through all layers")
    void removeMember_ThroughFullStack_RemovesOnlyThatStudent() throws Exception {
        User leaving = persistUser("Leaving Student");
        User staying = persistUser("Staying Student");
        persistMember(room, leaving, true, null);
        persistMember(room, staying, true, null);
        Group group = persistGroup(room, "Group 1", leaving, staying);

        mockMvc.perform(delete("/api/v1/groups/{id}/members/{studentId}", group.getId(), leaving.getId())
                        .with(authenticatedAs(tutor.getId())))
                .andExpect(status().isNoContent());

        entityManager.flush();
        entityManager.clear();
        assertEquals(Set.of(staying.getId()), memberIds(groupRepository.findById(group.getId()).orElseThrow()));
    }

    @Test
    @DisplayName("[US06] DELETE member by the Tutor of another room should return 403 and keep the membership")
    void removeMember_ByTutorOfAnotherRoom_Returns403_AndKeepsMembership() throws Exception {
        User student = persistUser("Grouped Student");
        persistMember(room, student, true, null);
        Group group = persistGroup(room, "Group 1", student);
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("Intruder Tutor");
        persistRoom("GRPI8", "Intruder Own Room", intruder);

        mockMvc.perform(delete("/api/v1/groups/{id}/members/{studentId}", group.getId(), student.getId())
                        .with(authenticatedAs(intruder.getId())))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals(Set.of(student.getId()), memberIds(groupRepository.findById(group.getId()).orElseThrow()));
    }

    @Test
    @DisplayName("[US06] DELETE member by an active student member of the room should return 403 and keep the membership")
    void removeMember_ByActiveStudentMember_Returns403_AndKeepsMembership() throws Exception {
        User student = persistUser("Grouped Student");
        persistMember(room, student, true, null);
        Group group = persistGroup(room, "Group 1", student);

        mockMvc.perform(delete("/api/v1/groups/{id}/members/{studentId}", group.getId(), student.getId())
                        .with(authenticatedAs(student.getId())))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals(Set.of(student.getId()), memberIds(groupRepository.findById(group.getId()).orElseThrow()));
    }

    // --- AVAILABLE STUDENTS THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US06] GET available students should return only active students of the room without a group")
    void listAvailableStudents_ThroughFullStack_ReturnsOnlyActiveUngroupedStudentsOfRoom() throws Exception {
        User available = persistUser("Available Student");
        User grouped = persistUser("Grouped Student");
        User unlinked = persistUser("Unlinked Student");
        User outsider = persistUser("Outsider Student");
        persistMember(room, available, true, null);
        persistMember(room, grouped, true, null);
        persistMember(room, unlinked, false, Instant.parse("2026-03-01T10:00:00Z"));
        persistGroup(room, "Group 1", grouped);

        Room otherRoom = persistRoom("GRPI4", "Other Room");
        persistMember(otherRoom, outsider, true, null);

        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/v1/rooms/{roomId}/groups/available-students", room.getId())
                        .with(authenticatedAs(tutor.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(available.getId()))
                .andExpect(jsonPath("$[0].name").value("Available Student"));
    }

    // --- STUDENT VIEW THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US06] GET my group should return the authenticated student group with all its members")
    void getMyGroup_ThroughFullStack_ReturnsStudentGroupWithPeers() throws Exception {
        User student = persistUser("Student A");
        User peer = persistUser("Student B");
        User outsider = persistUser("Student C");
        persistMember(room, student, true, null);
        persistMember(room, peer, true, null);
        persistMember(room, outsider, true, null);
        Group group = persistGroup(room, "Group 1", student, peer);
        persistGroup(room, "Group 2", outsider);

        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/v1/rooms/{roomId}/groups/me", room.getId())
                        .with(authenticatedAs(student.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(group.getId()))
                .andExpect(jsonPath("$.name").value("Group 1"))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[*].name", containsInAnyOrder("Student A", "Student B")));
    }

    // Helpers

    private Set<String> memberIds(Group group) {
        return group.getMembers().stream().map(User::getId).collect(Collectors.toSet());
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
        entityManager.persist(member);
        entityManager.flush();
    }
}
