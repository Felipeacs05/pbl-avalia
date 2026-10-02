package com.uefs.tfs.avaliasystem.US06;

import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

// Persistence slice only (H2 in memory, no web server); each test rolls back
@DataJpaTest
class GroupRepositoryTest {

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User tutor;
    private Room room;

    // Tutor and Room must exist physically to satisfy the foreign keys of Group
    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setName("Persisted Tutor");
        tutor = entityManager.persistFlushFind(tutor);

        room = persistRoom("GRP01", "Groups Room");
    }

    // --- REAL DATABASE WRITE ---

    @Test
    @DisplayName("[US06] save should persist the group linked to its room together with its members")
    void save_PersistsGroupLinkedToRoomWithMembers_AndSurvivesContextClear() {
        User student = persistUser("Student A");

        Group group = new Group();
        group.setName("Group 1");
        group.setRoom(room);
        group.getMembers().add(student);

        String savedId = groupRepository.save(group).getId();

        // Forces the read below to hit the database instead of the persistence context
        entityManager.flush();
        entityManager.clear();

        Optional<Group> found = groupRepository.findById(savedId);
        assertTrue(found.isPresent());
        assertEquals("Group 1", found.get().getName());
        assertEquals(room.getId(), found.get().getRoom().getId());
        assertEquals(Set.of(student.getId()), memberIds(found.get()));
    }

    @Test
    @DisplayName("[US06] save should persist the removal of a member from the group")
    void save_WithMemberRemoved_PersistsRemainingMembersOnly() {
        User leaving = persistUser("Leaving Student");
        User staying = persistUser("Staying Student");
        Group group = persistGroup(room, "Group 1", leaving, staying);

        group.getMembers().removeIf(member -> member.getId().equals(leaving.getId()));
        groupRepository.save(group);

        entityManager.flush();
        entityManager.clear();

        assertEquals(Set.of(staying.getId()), memberIds(groupRepository.findById(group.getId()).orElseThrow()));
    }

    // --- ONE GROUP PER STUDENT IN THE SAME ROOM ---

    @Test
    @DisplayName("[US06] existsByRoomIdAndMembersId should consider only the groups of the given room")
    void existsByRoomIdAndMembersId_ConsidersOnlyGroupsOfTheSameRoom() {
        User grouped = persistUser("Grouped Student");
        User free = persistUser("Free Student");
        persistGroup(room, "Group 1", grouped);

        Room otherRoom = persistRoom("GRP02", "Other Room");

        entityManager.clear();

        assertTrue(groupRepository.existsByRoomIdAndMembersId(room.getId(), grouped.getId()));
        assertFalse(groupRepository.existsByRoomIdAndMembersId(otherRoom.getId(), grouped.getId()));
        assertFalse(groupRepository.existsByRoomIdAndMembersId(room.getId(), free.getId()));
    }

    // --- STUDENT VIEW OF THEIR OWN GROUP ---

    @Test
    @DisplayName("[US06] findByRoomIdAndMembersId should return the student group with all its members")
    void findByRoomIdAndMembersId_ReturnsStudentGroupWithAllMembers() {
        User student = persistUser("Student A");
        User peer = persistUser("Student B");
        User outsider = persistUser("Student C");
        persistGroup(room, "Group 1", student, peer);
        persistGroup(room, "Group 2", outsider);

        entityManager.clear();

        Group found = groupRepository.findByRoomIdAndMembersId(room.getId(), student.getId()).orElseThrow();

        assertEquals("Group 1", found.getName());
        assertEquals(Set.of(student.getId(), peer.getId()), memberIds(found));
    }

    // Helpers

    private Set<String> memberIds(Group group) {
        return group.getMembers().stream().map(User::getId).collect(Collectors.toSet());
    }

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

    private Group persistGroup(Room targetRoom, String name, User... members) {
        Group group = new Group();
        group.setName(name);
        group.setRoom(targetRoom);
        group.getMembers().addAll(Arrays.asList(members));
        return entityManager.persistFlushFind(group);
    }
}
