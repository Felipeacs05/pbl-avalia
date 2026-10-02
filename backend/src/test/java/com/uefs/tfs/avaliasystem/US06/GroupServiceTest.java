package com.uefs.tfs.avaliasystem.US06;

import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.dto.GroupResponse;
import com.uefs.tfs.avaliasystem.dto.StudentResponse;
import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.GroupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

// Pure unit test: repositories are mocked, no Spring context, no database
@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @InjectMocks
    private GroupService groupService;

    @Mock
    private GroupRepository groupRepository;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private UserRepository userRepository;

    // Captures the entity the service tried to save so its state can be inspected
    @Captor
    private ArgumentCaptor<Group> groupCaptor;

    private Room room;
    private User memberStudent;
    private User newStudent;
    private Group existingGroup;

    private final String TUTOR_UUID = "123e4567-e89b-12d3-a456-426614174000";
    private final String STUDENT_UUID = "999e9999-e99b-99d9-a999-999999999999";
    private final String NEW_STUDENT_UUID = "888e8888-e88b-88d8-a888-888888888888";
    private final String ROOM_UUID = "987e6543-e21b-12d3-a456-426614174000";
    private final String GROUP_UUID = "777e7777-e77b-77d7-a777-777777777777";

    @BeforeEach
    void setUp() {
        User tutor = new User();
        tutor.setId(TUTOR_UUID);
        tutor.setName("Test Tutor");

        room = new Room();
        room.setId(ROOM_UUID);
        room.setName("Software Engineering Module");
        room.setTutor(tutor);

        memberStudent = new User();
        memberStudent.setId(STUDENT_UUID);
        memberStudent.setName("Student A");

        newStudent = new User();
        newStudent.setId(NEW_STUDENT_UUID);
        newStudent.setName("Student B");

        // Pre-existing group used by the update, delete and membership scenarios
        existingGroup = new Group();
        existingGroup.setId(GROUP_UUID);
        existingGroup.setName("Group 1");
        existingGroup.setRoom(room);
        existingGroup.getMembers().add(memberStudent);
    }

    // --- CREATION ---

    @Test
    @DisplayName("[US06] Should create a group linked to the room when the user is the room Tutor")
    void createGroup_ByRoomTutor_SavesGroupLinkedToRoom() {
        GroupRequest request = new GroupRequest("Group 1");

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        // Simulates the database assigning the id, so the response must be built from what save returns
        Mockito.when(groupRepository.save(any(Group.class))).thenAnswer(i -> {
            Group saved = i.getArgument(0);
            saved.setId(GROUP_UUID);
            return saved;
        });

        GroupResponse response = groupService.createGroup(ROOM_UUID, request, TUTOR_UUID);

        Mockito.verify(groupRepository).save(groupCaptor.capture());
        Group captured = groupCaptor.getValue();

        assertEquals("Group 1", captured.getName());
        // The group belongs to the room, not to a problem, so it stays the same along the semester
        assertEquals(ROOM_UUID, captured.getRoom().getId());
        assertTrue(captured.getMembers().isEmpty());

        assertEquals(GROUP_UUID, response.getId());
        assertEquals("Group 1", response.getName());
        assertTrue(response.getMembers().isEmpty());
    }

    @Test
    @DisplayName("[US06] Should block group creation when the user is not the room Tutor (IDOR)")
    void createGroup_ByNonTutor_ThrowsSecurityException() {
        GroupRequest request = new GroupRequest("Group 1");

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));

        SecurityException exception = assertThrows(SecurityException.class,
                () -> groupService.createGroup(ROOM_UUID, request, STUDENT_UUID));

        assertEquals("Only the room Tutor can manage its groups.", exception.getMessage());
        Mockito.verify(groupRepository, Mockito.never()).save(any(Group.class));
        // Stronger than never().save: no write of any kind (saveAndFlush, saveAll...) may reach the repository
        Mockito.verifyNoInteractions(groupRepository);
    }

    // --- UPDATE ---

    @Test
    @DisplayName("[US06] Should update only the name when the user is the room Tutor")
    void updateGroup_ByRoomTutor_UpdatesOnlyName() {
        GroupRequest request = new GroupRequest("Group 1 - Renamed");

        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));
        Mockito.when(groupRepository.save(any(Group.class))).thenAnswer(i -> i.getArgument(0));

        GroupResponse response = groupService.updateGroup(GROUP_UUID, request, TUTOR_UUID);

        Mockito.verify(groupRepository).save(groupCaptor.capture());
        Group captured = groupCaptor.getValue();

        assertEquals("Group 1 - Renamed", captured.getName());
        // Room link and members must not change on a rename
        assertEquals(ROOM_UUID, captured.getRoom().getId());
        assertEquals(Set.of(STUDENT_UUID), memberIds(captured));

        assertEquals(GROUP_UUID, response.getId());
        assertEquals("Group 1 - Renamed", response.getName());
        assertEquals(List.of(STUDENT_UUID), response.getMembers().stream().map(StudentResponse::getId).toList());
    }

    @Test
    @DisplayName("[US06] Should block group update when the user is not the room Tutor (IDOR)")
    void updateGroup_ByNonTutor_ThrowsSecurityException() {
        GroupRequest request = new GroupRequest("Hijacked Name");

        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));

        SecurityException exception = assertThrows(SecurityException.class,
                () -> groupService.updateGroup(GROUP_UUID, request, STUDENT_UUID));

        assertEquals("Only the room Tutor can manage its groups.", exception.getMessage());
        Mockito.verify(groupRepository, Mockito.never()).save(any(Group.class));
        // Only the ownership lookup is allowed; any other repository call would be a leaked write
        Mockito.verify(groupRepository).findById(GROUP_UUID);
        Mockito.verifyNoMoreInteractions(groupRepository);
    }

    // --- DELETION ---

    @Test
    @DisplayName("[US06] Should delete the group when the user is the room Tutor")
    void deleteGroup_ByRoomTutor_DeletesFromRepository() {
        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));

        groupService.deleteGroup(GROUP_UUID, TUTOR_UUID);

        Mockito.verify(groupRepository, Mockito.times(1)).delete(existingGroup);
    }

    @Test
    @DisplayName("[US06] Should block group deletion when the user is not the room Tutor (IDOR)")
    void deleteGroup_ByNonTutor_ThrowsSecurityException() {
        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));

        SecurityException exception = assertThrows(SecurityException.class,
                () -> groupService.deleteGroup(GROUP_UUID, STUDENT_UUID));

        assertEquals("Only the room Tutor can manage its groups.", exception.getMessage());
        Mockito.verify(groupRepository, Mockito.never()).delete(any(Group.class));
        // Also rules out deleteById or any other removal path
        Mockito.verify(groupRepository).findById(GROUP_UUID);
        Mockito.verifyNoMoreInteractions(groupRepository);
    }

    // --- ADDING A STUDENT ---

    @Test
    @DisplayName("[US06] Should add a student linked to the room who has no group yet")
    void addMember_WithStudentLinkedToRoomAndWithoutGroup_AddsToGroup() {
        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));
        Mockito.when(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(ROOM_UUID, NEW_STUDENT_UUID))
               .thenReturn(true);
        Mockito.when(groupRepository.existsByRoomIdAndMembersId(ROOM_UUID, NEW_STUDENT_UUID)).thenReturn(false);
        Mockito.when(userRepository.findById(NEW_STUDENT_UUID)).thenReturn(Optional.of(newStudent));
        Mockito.when(groupRepository.save(any(Group.class))).thenAnswer(i -> i.getArgument(0));

        GroupResponse response = groupService.addMember(GROUP_UUID, NEW_STUDENT_UUID, TUTOR_UUID);

        Mockito.verify(groupRepository).save(groupCaptor.capture());
        assertEquals(Set.of(STUDENT_UUID, NEW_STUDENT_UUID), memberIds(groupCaptor.getValue()));

        assertEquals(Set.of(STUDENT_UUID, NEW_STUDENT_UUID),
                response.getMembers().stream().map(StudentResponse::getId).collect(Collectors.toSet()));
    }

    @Test
    @DisplayName("[US06] Should block adding a student who is not enrolled in the room (integrity)")
    void addMember_WithStudentNotLinkedToRoom_ThrowsIllegalArgument_AndSavesNothing() {
        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));
        Mockito.when(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(ROOM_UUID, NEW_STUDENT_UUID))
               .thenReturn(false);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> groupService.addMember(GROUP_UUID, NEW_STUDENT_UUID, TUTOR_UUID));

        assertEquals("Student is not linked to this room.", exception.getMessage());
        Mockito.verify(groupRepository, Mockito.never()).save(any(Group.class));
        // The enrollment is checked against the room of the group, before the student is even loaded
        Mockito.verifyNoInteractions(userRepository);
        assertEquals(Set.of(STUDENT_UUID), memberIds(existingGroup));
    }

    @Test
    @DisplayName("[US06] Should block adding a student who already belongs to a group of the same room")
    void addMember_WithStudentAlreadyInAGroupOfTheRoom_ThrowsIllegalArgument_AndSavesNothing() {
        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));
        Mockito.when(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(ROOM_UUID, NEW_STUDENT_UUID))
               .thenReturn(true);
        Mockito.when(groupRepository.existsByRoomIdAndMembersId(ROOM_UUID, NEW_STUDENT_UUID)).thenReturn(true);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> groupService.addMember(GROUP_UUID, NEW_STUDENT_UUID, TUTOR_UUID));

        assertEquals("Student already belongs to a group in this room.", exception.getMessage());
        Mockito.verify(groupRepository, Mockito.never()).save(any(Group.class));
    }

    @Test
    @DisplayName("[US06] Should block adding a student when the user is not the room Tutor (IDOR)")
    void addMember_ByNonTutor_ThrowsSecurityException() {
        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));

        SecurityException exception = assertThrows(SecurityException.class,
                () -> groupService.addMember(GROUP_UUID, NEW_STUDENT_UUID, STUDENT_UUID));

        assertEquals("Only the room Tutor can manage its groups.", exception.getMessage());
        Mockito.verify(groupRepository, Mockito.never()).save(any(Group.class));
        Mockito.verify(groupRepository).findById(GROUP_UUID);
        Mockito.verifyNoMoreInteractions(groupRepository);
        Mockito.verifyNoInteractions(roomMemberRepository, userRepository);
        assertEquals(Set.of(STUDENT_UUID), memberIds(existingGroup));
    }

    // --- REMOVING A STUDENT ---

    @Test
    @DisplayName("[US06] Should remove the student from the group when the user is the room Tutor")
    void removeMember_ByRoomTutor_RemovesStudentFromGroup() {
        existingGroup.getMembers().add(newStudent);

        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));
        Mockito.when(groupRepository.save(any(Group.class))).thenAnswer(i -> i.getArgument(0));

        groupService.removeMember(GROUP_UUID, STUDENT_UUID, TUTOR_UUID);

        Mockito.verify(groupRepository).save(groupCaptor.capture());
        // Only the given student leaves; the rest of the team stays in the group
        assertEquals(Set.of(NEW_STUDENT_UUID), memberIds(groupCaptor.getValue()));
    }

    @Test
    @DisplayName("[US06] Should block removing a student when the user is not the room Tutor (IDOR)")
    void removeMember_ByNonTutor_ThrowsSecurityException() {
        Mockito.when(groupRepository.findById(GROUP_UUID)).thenReturn(Optional.of(existingGroup));

        SecurityException exception = assertThrows(SecurityException.class,
                () -> groupService.removeMember(GROUP_UUID, STUDENT_UUID, STUDENT_UUID));

        assertEquals("Only the room Tutor can manage its groups.", exception.getMessage());
        Mockito.verify(groupRepository, Mockito.never()).save(any(Group.class));
        Mockito.verify(groupRepository).findById(GROUP_UUID);
        Mockito.verifyNoMoreInteractions(groupRepository);
        assertEquals(Set.of(STUDENT_UUID), memberIds(existingGroup));
    }

    // --- AVAILABLE STUDENTS ---

    @Test
    @DisplayName("[US06] Should list as available only the students the repository returns for the room")
    void listAvailableStudents_MapsRepositoryStudentsToResponses() {
        Mockito.when(roomMemberRepository.findAvailableStudentsByRoomId(ROOM_UUID))
               .thenReturn(List.of(newStudent));

        List<StudentResponse> result = groupService.listAvailableStudents(ROOM_UUID);

        assertEquals(List.of(NEW_STUDENT_UUID), result.stream().map(StudentResponse::getId).toList());
        assertEquals(List.of("Student B"), result.stream().map(StudentResponse::getName).toList());
    }

    // --- STUDENT VIEW OF THEIR OWN GROUP ---

    @Test
    @DisplayName("[US06] Should return the student own group with all its members")
    void getMyGroup_ByGroupedStudent_ReturnsGroupWithAllMembers() {
        existingGroup.getMembers().add(newStudent);

        Mockito.when(groupRepository.findByRoomIdAndMembersId(ROOM_UUID, STUDENT_UUID))
               .thenReturn(Optional.of(existingGroup));

        GroupResponse response = groupService.getMyGroup(ROOM_UUID, STUDENT_UUID);

        assertEquals(GROUP_UUID, response.getId());
        assertEquals("Group 1", response.getName());
        assertEquals(Set.of("Student A", "Student B"),
                response.getMembers().stream().map(StudentResponse::getName).collect(Collectors.toSet()));
    }

    // Helpers

    private Set<String> memberIds(Group group) {
        return group.getMembers().stream().map(User::getId).collect(Collectors.toSet());
    }
}
