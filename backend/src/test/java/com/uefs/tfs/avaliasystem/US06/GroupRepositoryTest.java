package com.uefs.tfs.avaliasystem.US06;

import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.GroupMember;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.GroupMemberRepository;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class GroupRepositoryTest {

    @Autowired GroupRepository groupRepository;
    @Autowired GroupMemberRepository groupMemberRepository;
    @Autowired TestEntityManager entityManager;

    private User tutor;
    private Room room;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor");
        room = persistRoom("GRP01", "Groups Room");
    }

    @Test
    void save_PersistsGroupLinkedToRoomAndMembers() {
        User student = persistUser("Student A");
        Group group = persistGroup(room, "Group 1");
        persistGroupMember(group, student);

        entityManager.flush();
        entityManager.clear();

        Group found = groupRepository.findById(group.getId()).orElseThrow();
        assertEquals(room.getId(), found.getRoom().getId());
        assertEquals(Set.of(student.getId()), memberIds(found));
    }

    @Test
    void deletingMembership_PersistsRemainingMembersOnly() {
        User leaving = persistUser("Leaving");
        User staying = persistUser("Staying");
        Group group = persistGroup(room, "Group 1");
        GroupMember leavingMembership = persistGroupMember(group, leaving);
        persistGroupMember(group, staying);

        groupMemberRepository.delete(leavingMembership);
        entityManager.flush();
        entityManager.clear();

        assertEquals(Set.of(staying.getId()),
                memberIds(groupRepository.findById(group.getId()).orElseThrow()));
    }

    @Test
    void findByRoomId_ReturnsOnlyGroupsFromRequestedRoom() {
        persistGroup(room, "Group 1");
        Room otherRoom = persistRoom("GRP02", "Other Room");
        persistGroup(otherRoom, "Other Group");

        List<Group> result = groupRepository.findByRoomId(room.getId());

        assertEquals(List.of("Group 1"), result.stream().map(Group::getName).toList());
    }

    @Test
    void findByIdAndRoomId_ValidatesGroupRoomRelationship() {
        Group group = persistGroup(room, "Group 1");
        Room otherRoom = persistRoom("GRP03", "Other Room");

        assertTrue(groupRepository.findByIdAndRoomId(group.getId(), room.getId()).isPresent());
        assertTrue(groupRepository.findByIdAndRoomId(group.getId(), otherRoom.getId()).isEmpty());
    }

    private Set<UUID> memberIds(Group group) {
        return group.getMembers().stream()
                .map(member -> member.getUser().getId())
                .collect(Collectors.toSet());
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        user.setEmail(name.replace(" ", ".").toLowerCase() + "." + UUID.randomUUID() + "@test.local");
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

    private Group persistGroup(Room targetRoom, String name) {
        Group group = new Group();
        group.setName(name);
        group.setRoom(targetRoom);
        return entityManager.persistFlushFind(group);
    }

    private GroupMember persistGroupMember(Group group, User user) {
        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setUser(user);
        GroupMember persisted = entityManager.persistFlushFind(member);
        group.getMembers().add(persisted);
        return persisted;
    }
}
