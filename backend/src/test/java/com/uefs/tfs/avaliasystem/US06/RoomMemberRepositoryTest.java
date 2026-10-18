package com.uefs.tfs.avaliasystem.US06;

import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class RoomMemberRepositoryTest {

    @Autowired RoomMemberRepository roomMemberRepository;
    @Autowired TestEntityManager entityManager;

    private User tutor;
    private Room room;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor");
        room = persistRoom("GRM01", "Groups Room");
    }

    @Test
    void activeMembershipQuery_AcceptsOnlyActiveLinkFromRequestedRoom() {
        User active = persistUser("Active");
        User inactive = persistUser("Inactive");
        User outsider = persistUser("Outsider");
        persistRoomMember(room, active, true);
        persistRoomMember(room, inactive, false);
        Room otherRoom = persistRoom("GRM02", "Other Room");
        persistRoomMember(otherRoom, outsider, true);

        assertTrue(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), active.getId()));
        assertFalse(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), inactive.getId()));
        assertFalse(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), outsider.getId()));
    }

    @Test
    void availableStudents_ReturnsOnlyActiveUngroupedStudents() {
        User available = persistUser("Available");
        User grouped = persistUser("Grouped");
        User inactive = persistUser("Inactive");
        persistRoomMember(room, available, true);
        persistRoomMember(room, grouped, true);
        persistRoomMember(room, inactive, false);
        persistGroupMember(persistGroup(room, "Group 1"), grouped);

        List<User> result = roomMemberRepository.findAvailableStudentsByRoomId(room.getId());

        assertEquals(List.of(available.getId()), result.stream().map(User::getId).toList());
    }

    @Test
    void availableStudents_DoesNotConsiderGroupsFromAnotherRoom() {
        User student = persistUser("Student");
        persistRoomMember(room, student, true);
        Room otherRoom = persistRoom("GRM03", "Other Room");
        persistRoomMember(otherRoom, student, true);
        persistGroupMember(persistGroup(otherRoom, "Other Group"), student);

        List<User> result = roomMemberRepository.findAvailableStudentsByRoomId(room.getId());

        assertEquals(List.of(student.getId()), result.stream().map(User::getId).toList());
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        user.setEmail(name.toLowerCase() + "." + UUID.randomUUID() + "@test.local");
        user.setPassword("encoded-password");
        return entityManager.persistFlushFind(user);
    }

    private Room persistRoom(String code, String name) {
        Room value = new Room();
        value.setName(name);
        value.setAccessCode(code);
        value.setInviteLink("app/join/" + code);
        value.setTutor(tutor);
        return entityManager.persistFlushFind(value);
    }

    private RoomMember persistRoomMember(Room targetRoom, User user, boolean active) {
        RoomMember member = new RoomMember();
        member.setRoom(targetRoom);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        member.setUnlinkedAt(active ? null : Instant.now());
        return entityManager.persistFlushFind(member);
    }

    private Group persistGroup(Room targetRoom, String name) {
        Group group = new Group();
        group.setName(name);
        group.setRoom(targetRoom);
        return entityManager.persistFlushFind(group);
    }

    private void persistGroupMember(Group group, User user) {
        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setUser(user);
        entityManager.persistFlushFind(member);
    }
}
