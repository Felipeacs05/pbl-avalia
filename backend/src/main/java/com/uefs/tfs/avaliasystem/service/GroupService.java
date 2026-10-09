package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.dto.GroupResponse;
import com.uefs.tfs.avaliasystem.dto.GroupMemberResponse;
import com.uefs.tfs.avaliasystem.exception.ResourceConflictException;
import com.uefs.tfs.avaliasystem.exception.ResourceNotFoundException;
import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.GroupMember;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.repository.GroupMemberRepository;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.HashSet;
import java.util.UUID;

@Service
public class GroupService {

    private final RoomRepository roomRepository;
    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final RoomMemberRepository roomMemberRepository;

    public GroupService(
            RoomRepository roomRepository,
            GroupRepository groupRepository,
            GroupMemberRepository groupMemberRepository,
            RoomMemberRepository roomMemberRepository
    ) {
        this.roomRepository = roomRepository;
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.roomMemberRepository = roomMemberRepository;
    }

    @Transactional
    public GroupResponse createGroup(UUID roomId, GroupRequest request, UUID tutorId) {
        Room room = findRoomAndValidateTutor(roomId, tutorId);

        Group group = new Group();
        group.setName(request.getName());
        group.setRoom(room);

        group = groupRepository.save(group);

        List<UUID> memberIds = request.getMemberIds();
        if (new HashSet<>(memberIds).size() != memberIds.size()) {
            throw new ResourceConflictException("A lista de integrantes possui alunos duplicados");
        }

        List<UUID> orderedMemberIds = memberIds.stream()
                .sorted()
                .toList();

        for (UUID studentId : orderedMemberIds) {
            RoomMember roomMember = findActiveRoomMemberForUpdate(roomId, studentId);
            addMemberToGroup(group, roomMember);
        }

        return new GroupResponse(group);
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> listGroups(UUID roomId) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Sala não encontrada");
        }

        return groupRepository.findByRoomId(roomId).stream()
                .map(GroupResponse::new)
                .toList();
    }

    @Transactional
    public GroupResponse updateGroup(
            UUID roomId,
            UUID groupId,
            GroupRequest request,
            UUID tutorId
    ) {
        Group group = findGroupInRoom(groupId, roomId);
        validateTutor(group.getRoom(), tutorId);

        group.setName(request.getName());
        return new GroupResponse(groupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(UUID roomId, UUID groupId, UUID tutorId) {
        Group group = findGroupInRoom(groupId, roomId);
        validateTutor(group.getRoom(), tutorId);
        groupRepository.delete(group);
    }

    @Transactional
    public GroupResponse addMember(
            UUID roomId,
            UUID groupId,
            UUID studentId,
            UUID tutorId
    ) {
        Group group = findGroupInRoom(groupId, roomId);
        validateTutor(group.getRoom(), tutorId);

        RoomMember roomMember = findActiveRoomMemberForUpdate(roomId, studentId);
        addMemberToGroup(group, roomMember);

        return new GroupResponse(group);
    }

    @Transactional
    public void removeMember(
            UUID roomId,
            UUID groupId,
            UUID studentId,
            UUID tutorId
    ) {
        Group group = findGroupInRoom(groupId, roomId);
        validateTutor(group.getRoom(), tutorId);

        GroupMember groupMember = groupMemberRepository
                .findByGroupIdAndUserId(groupId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado neste grupo"));

        group.getMembers().remove(groupMember);
        groupMemberRepository.delete(groupMember);
    }

    @Transactional(readOnly = true)
    public GroupResponse getMyGroup(UUID roomId, UUID studentId) {
        requireActiveRoomMembership(roomId, studentId);

        GroupMember groupMember = groupMemberRepository
                .findByGroupRoomIdAndUserId(roomId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("O aluno não pertence a nenhum grupo desta sala"));

        return new GroupResponse(groupMember.getGroup());
    }

    @Transactional(readOnly = true)
    public List<GroupMemberResponse> listAvailableStudents(UUID roomId) {
        if (!roomRepository.existsById(roomId)) {
            throw new ResourceNotFoundException("Sala não encontrada");
        }

        return roomMemberRepository.findAvailableStudentsByRoomId(roomId).stream()
                .map(student -> new GroupMemberResponse(student.getName(), student.getId()))
                .toList();
    }

    private Room findRoomAndValidateTutor(UUID roomId, UUID tutorId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Sala não encontrada"));

        validateTutor(room, tutorId);
        return room;
    }

    private Group findGroupInRoom(UUID groupId, UUID roomId) {
        return groupRepository.findByIdAndRoomId(groupId, roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Grupo não encontrado na sala informada"));
    }

    private void requireActiveRoomMembership(UUID roomId, UUID studentId) {
        RoomMember roomMember = roomMemberRepository.findByRoomIdAndUserId(roomId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("O aluno não pertence à sala informada"));

        validateActiveStudent(roomMember);
    }

    private RoomMember findActiveRoomMemberForUpdate(UUID roomId, UUID studentId) {
        RoomMember roomMember = roomMemberRepository
                .findByRoomIdAndUserIdForUpdate(roomId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("O aluno não pertence à sala informada"));

        validateActiveStudent(roomMember);
        return roomMember;
    }

    private void validateActiveStudent(RoomMember roomMember) {

        if (!roomMember.isActive()) {
            throw new IllegalArgumentException("O aluno não possui vínculo ativo com a sala informada");
        }

        if (roomMember.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("O usuário informado não é aluno desta sala");
        }
    }

    private void addMemberToGroup(Group group, RoomMember roomMember) {
        UUID roomId = group.getRoom().getId();
        UUID studentId = roomMember.getUser().getId();

        if (groupMemberRepository.existsByGroupRoomIdAndUserId(roomId, studentId)) {
            throw new ResourceConflictException("O aluno já pertence a um grupo desta sala");
        }

        GroupMember groupMember = new GroupMember();
        groupMember.setGroup(group);
        groupMember.setUser(roomMember.getUser());
        groupMemberRepository.save(groupMember);
        group.getMembers().add(groupMember);
    }

    private void validateTutor(Room room, UUID tutorId) {
        if (!room.getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Apenas o tutor da sala pode alterar grupos.");
        }
    }
}
