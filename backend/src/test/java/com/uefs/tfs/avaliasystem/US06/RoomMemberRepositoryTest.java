package com.uefs.tfs.avaliasystem.US06;

import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// Persistence slice only (H2 in memory, no web server); each test rolls back.
// Only the room-link queries US06 relies on; joining and leaving a room belong to other stories.
@DataJpaTest
class RoomMemberRepositoryTest {

    @Autowired
    private RoomMemberRepository roomMemberRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User tutor;
    private Room room;

    // Tutor and Room must exist physically to satisfy the foreign keys of RoomMember
    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setName("Persisted Tutor");
        tutor = entityManager.persistFlushFind(tutor);

        room = persistRoom("GRM01", "Groups Room");
    }

    // --- ROOM ENROLLMENT (INTEGRITY BLOCK) ---

    @Test
    @DisplayName("[US06] existsByRoomIdAndUserIdAndActiveTrue should accept only active links to the given room")
    void existsByRoomIdAndUserIdAndActiveTrue_AcceptsOnlyActiveLinksToTheRoom() {
        User enrolled = persistUser("Enrolled Student");
        User unlinked = persistUser("Unlinked Student");
        User outsider = persistUser("Outsider Student");
        persistMember(room, enrolled, true, null);
        persistMember(room, unlinked, false, Instant.parse("2026-03-01T10:00:00Z"));

        Room otherRoom = persistRoom("GRM02", "Other Room");
        persistMember(otherRoom, outsider, true, null);

        entityManager.clear();

        assertTrue(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), enrolled.getId()));
        assertFalse(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), unlinked.getId()));
        assertFalse(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), outsider.getId()));
    }

    // --- AVAILABLE STUDENTS TO COMPOSE A GROUP ---

    @Test
    @DisplayName("[US06] findAvailableStudentsByRoomId should return only active students of the room without a group")
    void findAvailableStudentsByRoomId_ReturnsOnlyActiveUngroupedStudentsOfTheRoom() {
        User available = persistUser("Available Student");
        User grouped = persistUser("Grouped Student");
        User unlinked = persistUser("Unlinked Student");
        User outsider = persistUser("Outsider Student");
        persistMember(room, available, true, null);
        persistMember(room, grouped, true, null);
        persistMember(room, unlinked, false, Instant.parse("2026-03-01T10:00:00Z"));
        persistGroup(room, "Group 1", grouped);

        Room otherRoom = persistRoom("GRM03", "Other Room");
        persistMember(otherRoom, outsider, true, null);

        entityManager.clear();

        List<User> result = roomMemberRepository.findAvailableStudentsByRoomId(room.getId());

        assertEquals(List.of(available.getId()), result.stream().map(User::getId).toList());
    }

    @Test
    @DisplayName("[US06] findAvailableStudentsByRoomId should not hide a student grouped only in another room")
    void findAvailableStudentsByRoomId_IgnoresGroupsOfOtherRooms() {
        User student = persistUser("Student In Two Rooms");
        persistMember(room, student, true, null);

        Room otherRoom = persistRoom("GRM04", "Other Room");
        persistMember(otherRoom, student, true, null);
        persistGroup(otherRoom, "Other Room Group", student);

        entityManager.clear();

        List<User> result = roomMemberRepository.findAvailableStudentsByRoomId(room.getId());

        assertEquals(List.of(student.getId()), result.stream().map(User::getId).toList());
    }

    // Helpers

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        return entityManager.persistFlushFind(user);
    }

    private Room persistRoom(String code, String name) {
        Room newRoom = new Room();
        newRoom.setName(name);
        newRoom.setAccessCode(code);
        newRoom.setInviteLink("app/join/" + code);
        newRoom.setTutor(tutor);
        return entityManager.persistFlushFind(newRoom);
    }

    private void persistGroup(Room targetRoom, String name, User member) {
        Group group = new Group();
        group.setName(name);
        group.setRoom(targetRoom);
        group.getMembers().add(member);
        entityManager.persistFlushFind(group);
    }

    private void persistMember(Room targetRoom, User user, boolean active, Instant unlinkedAt) {
        RoomMember member = new RoomMember();
        member.setRoom(targetRoom);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        member.setUnlinkedAt(unlinkedAt);
        entityManager.persistFlushFind(member);
    }
}
