package com.uefs.tfs.avaliasystem.US06;

import com.uefs.tfs.avaliasystem.dto.GroupMemberResponse;
import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.dto.GroupResponse;
import com.uefs.tfs.avaliasystem.exception.ResourceConflictException;
import com.uefs.tfs.avaliasystem.exception.ResourceNotFoundException;
import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.GroupMemberRepository;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.service.GroupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @InjectMocks GroupService groupService;
    @Mock GroupRepository groupRepository;
    @Mock RoomRepository roomRepository;
    @Mock GroupMemberRepository groupMemberRepository;
    @Mock RoomMemberRepository roomMemberRepository;

    private static final UUID TUTOR_ID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private static final UUID STUDENT_ID = UUID.fromString("999e9999-e99b-49d9-a999-999999999999");
    private static final UUID NEW_STUDENT_ID = UUID.fromString("888e8888-e88b-48d8-a888-888888888888");
    private static final UUID ROOM_ID = UUID.fromString("987e6543-e21b-42d3-a456-426614174000");
    private static final UUID GROUP_ID = UUID.fromString("777e7777-e77b-47d7-a777-777777777777");

    private Room room;
    private User student;
    private User newStudent;
    private Group group;
    private RoomMember newStudentRoomMember;

    @BeforeEach
    void setUp() {
        User tutor = user(TUTOR_ID, "Tutor");
        student = user(STUDENT_ID, "Student A");
        newStudent = user(NEW_STUDENT_ID, "Student B");

        room = new Room();
        room.setId(ROOM_ID);
        room.setName("Room");
        room.setTutor(tutor);

        group = new Group();
        group.setId(GROUP_ID);
        group.setName("Group 1");
        group.setRoom(room);
        group.getMembers().add(groupMember(group, student));

        newStudentRoomMember = roomMember(newStudent, true);
    }

    @Test
    void createGroup_ByTutor_SavesLinkedGroup() {
        Mockito.when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        Mockito.when(groupRepository.save(any(Group.class))).thenAnswer(invocation -> {
            Group saved = invocation.getArgument(0);
            saved.setId(GROUP_ID);
            return saved;
        });

        GroupResponse response = groupService.createGroup(ROOM_ID, new GroupRequest("Group 1"), TUTOR_ID);

        assertEquals(GROUP_ID, response.getId());
        assertEquals(ROOM_ID, response.getRoomId());
        assertTrue(response.getMembers().isEmpty());
    }

    @Test
    void createGroup_ByNonTutor_IsRejected() {
        Mockito.when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));

        assertThrows(SecurityException.class,
                () -> groupService.createGroup(ROOM_ID, new GroupRequest("Group 1"), STUDENT_ID));

        Mockito.verify(groupRepository, Mockito.never()).save(any());
    }

    @Test
    void updateGroup_ByTutor_ChangesOnlyName() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));
        Mockito.when(groupRepository.save(group)).thenReturn(group);

        GroupResponse response = groupService.updateGroup(
                ROOM_ID, GROUP_ID, new GroupRequest("Renamed"), TUTOR_ID);

        assertEquals("Renamed", response.getName());
        assertEquals(Set.of(STUDENT_ID), responseMemberIds(response));
    }

    @Test
    void updateGroup_ByNonTutor_IsRejected() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));

        assertThrows(SecurityException.class,
                () -> groupService.updateGroup(
                        ROOM_ID, GROUP_ID, new GroupRequest("Hijacked"), STUDENT_ID));
    }

    @Test
    void deleteGroup_ByTutor_DeletesGroup() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));

        groupService.deleteGroup(ROOM_ID, GROUP_ID, TUTOR_ID);

        Mockito.verify(groupRepository).delete(group);
    }

    @Test
    void deleteGroup_ByNonTutor_IsRejected() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));

        assertThrows(SecurityException.class,
                () -> groupService.deleteGroup(ROOM_ID, GROUP_ID, STUDENT_ID));

        Mockito.verify(groupRepository, Mockito.never()).delete(any());
    }

    @Test
    void addMember_WithActiveRoomMember_AddsGroupMember() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));
        Mockito.when(roomMemberRepository.findByRoomIdAndUserIdForUpdate(ROOM_ID, NEW_STUDENT_ID))
                .thenReturn(Optional.of(newStudentRoomMember));
        Mockito.when(groupMemberRepository.existsByGroupRoomIdAndUserId(ROOM_ID, NEW_STUDENT_ID))
                .thenReturn(false);
        Mockito.when(groupMemberRepository.save(any(GroupMember.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        GroupResponse response = groupService.addMember(ROOM_ID, GROUP_ID, NEW_STUDENT_ID, TUTOR_ID);

        assertEquals(Set.of(STUDENT_ID, NEW_STUDENT_ID), responseMemberIds(response));
    }

    @Test
    void addMember_WhenNotEnrolled_IsRejected() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));
        Mockito.when(roomMemberRepository.findByRoomIdAndUserIdForUpdate(ROOM_ID, NEW_STUDENT_ID))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> groupService.addMember(ROOM_ID, GROUP_ID, NEW_STUDENT_ID, TUTOR_ID));

        Mockito.verify(groupMemberRepository, Mockito.never()).save(any());
    }

    @Test
    void addMember_WhenAlreadyGrouped_ReturnsConflict() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));
        Mockito.when(roomMemberRepository.findByRoomIdAndUserIdForUpdate(ROOM_ID, NEW_STUDENT_ID))
                .thenReturn(Optional.of(newStudentRoomMember));
        Mockito.when(groupMemberRepository.existsByGroupRoomIdAndUserId(ROOM_ID, NEW_STUDENT_ID))
                .thenReturn(true);

        assertThrows(ResourceConflictException.class,
                () -> groupService.addMember(ROOM_ID, GROUP_ID, NEW_STUDENT_ID, TUTOR_ID));
    }

    @Test
    void addMember_ByNonTutor_IsRejectedBeforeMembershipQueries() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));

        assertThrows(SecurityException.class,
                () -> groupService.addMember(ROOM_ID, GROUP_ID, NEW_STUDENT_ID, STUDENT_ID));

        Mockito.verifyNoInteractions(roomMemberRepository);
    }

    @Test
    void removeMember_ByTutor_DeletesOnlyRequestedMembership() {
        GroupMember membership = group.getMembers().getFirst();
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));
        Mockito.when(groupMemberRepository.findByGroupIdAndUserId(GROUP_ID, STUDENT_ID))
                .thenReturn(Optional.of(membership));

        groupService.removeMember(ROOM_ID, GROUP_ID, STUDENT_ID, TUTOR_ID);

        Mockito.verify(groupMemberRepository).delete(membership);
    }

    @Test
    void removeMember_ByNonTutor_IsRejected() {
        Mockito.when(groupRepository.findByIdAndRoomId(GROUP_ID, ROOM_ID)).thenReturn(Optional.of(group));

        assertThrows(SecurityException.class,
                () -> groupService.removeMember(ROOM_ID, GROUP_ID, STUDENT_ID, STUDENT_ID));

        Mockito.verify(groupMemberRepository, Mockito.never()).delete(any());
    }

    @Test
    void listAvailableStudents_MapsRepositoryUsers() {
        Mockito.when(roomRepository.existsById(ROOM_ID)).thenReturn(true);
        Mockito.when(roomMemberRepository.findAvailableStudentsByRoomId(ROOM_ID))
                .thenReturn(List.of(newStudent));

        List<GroupMemberResponse> result = groupService.listAvailableStudents(ROOM_ID);

        assertEquals(List.of(NEW_STUDENT_ID), result.stream().map(GroupMemberResponse::getId).toList());
    }

    @Test
    void getMyGroup_ReturnsStudentGroup() {
        RoomMember activeMembership = roomMember(student, true);
        GroupMember groupMembership = group.getMembers().getFirst();
        Mockito.when(roomMemberRepository.findByRoomIdAndUserId(ROOM_ID, STUDENT_ID))
                .thenReturn(Optional.of(activeMembership));
        Mockito.when(groupMemberRepository.findByGroupRoomIdAndUserId(ROOM_ID, STUDENT_ID))
                .thenReturn(Optional.of(groupMembership));

        GroupResponse response = groupService.getMyGroup(ROOM_ID, STUDENT_ID);

        assertEquals(GROUP_ID, response.getId());
        assertEquals(Set.of(STUDENT_ID), responseMemberIds(response));
    }

    private User user(UUID id, String name) {
        User user = new User();
        user.setId(id);
        user.setName(name);
        return user;
    }

    private RoomMember roomMember(User user, boolean active) {
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        return member;
    }

    private GroupMember groupMember(Group targetGroup, User user) {
        GroupMember member = new GroupMember();
        member.setGroup(targetGroup);
        member.setUser(user);
        return member;
    }

    private Set<UUID> responseMemberIds(GroupResponse response) {
        return response.getMembers().stream()
                .map(GroupMemberResponse::getId)
                .collect(Collectors.toSet());
    }
}
