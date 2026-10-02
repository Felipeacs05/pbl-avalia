package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.RoomDto;
import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidAccessCodeException;
import com.uefs.tfs.avaliasystem.exception.TooManyAttemptsException;
import com.uefs.tfs.avaliasystem.exception.UserNotFoundException;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final RateLimitingService rateLimitingService;

    public RoomService(RoomRepository roomRepository,
                       UserRepository userRepository,
                       RoomMemberRepository roomMemberRepository,
                       RateLimitingService rateLimitingService) {
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.roomMemberRepository = roomMemberRepository;
        this.rateLimitingService = rateLimitingService;
    }

    @Transactional
    public RoomResponse createRoom(RoomRequest request, UUID tutorId) {
        User tutor = userRepository.findById((tutorId))
                .orElseThrow(() -> new IllegalArgumentException("Utilizador não encontrado para assumir o papel de Tutor."));

        Room room = new Room();
        room.setName(request.getName());
        room.setTutor(tutor);

        String accessCode;
        do {
            accessCode = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        } while (roomRepository.existsByAccessCode(accessCode));

        room.setAccessCode(accessCode);
        room.setInviteLink("app/join/" + accessCode);

        room = roomRepository.save(room);

        return new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink());
    }

    @Transactional
    public RoomResponse updateRoom(UUID roomId, RoomRequest request, UUID tutorId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada"));

        if (!room.getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Apenas o Tutor da sala possui permissão para editá-la.");
        }

        room.setName(request.getName());
        room = roomRepository.save(room);

        return new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink());
    }

    @Transactional
    public void deleteRoom(UUID roomId, UUID tutorId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada"));

        if (!room.getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Apenas o Tutor da sala possui permissão para excluí-la.");
        }

        roomRepository.delete(room);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(UUID userId) {
        return roomRepository.findAllByTutorOrActiveMember(userId).stream()
                .map(room -> new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboardByUser(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException("User not found: " + userId);
        }

        List<RoomDto> roomsAsTutor = roomRepository.findByTutorId(userId).stream()
                .map(RoomDto::from)
                .toList();
        List<RoomDto> roomsAsStudent = roomRepository.findRoomsByParticipantId(userId).stream()
                .map(RoomDto::from)
                .toList();

        return new DashboardResponse(roomsAsTutor, roomsAsStudent);
    }

    @Transactional
    public RoomResponse joinRoom(UUID userId, String accessCode, String ip) {
        if (rateLimitingService.isIpBlocked(ip)) {
            throw new TooManyAttemptsException("IP bloqueado temporariamente por excesso de tentativas");
        }

        if (accessCode == null || accessCode.trim().isEmpty()){
            throw new InvalidAccessCodeException("Código de acesso não pode estar vazio");
        }

        Room room = roomRepository.findByAccessCode(accessCode.trim().toUpperCase()).orElseThrow(() -> {
            rateLimitingService.registerFailedAttempt(ip);
            return new InvalidAccessCodeException("Código de acesso inválido");
        });

        User student = userRepository.findById(userId).orElseThrow(() ->
                new IllegalArgumentException("Usuário não encontrado"));
        if (room.getTutor() != null && room.getTutor().getId().equals(userId)){
            throw new IllegalArgumentException("Tutor não pode ingressar como aluno na prórpia sala");
        }

        Optional<RoomMember> existingMemberOpt = roomMemberRepository.findByRoomIdAndUserId(room.getId(), userId);

        if (existingMemberOpt.isPresent()) {
            RoomMember member = existingMemberOpt.get();
            if (!member.isActive()) {
                member.setActive(true);
                member.setUnlinkedAt(null);
                roomMemberRepository.save(member);
            }
        } else {
            RoomMember newMember = new RoomMember();
            newMember.setRoom(room);
            newMember.setUser(student);
            newMember.setRole(Role.STUDENT);
            newMember.setActive(true);
            newMember.setUnlinkedAt(null);
            roomMemberRepository.save(newMember);
        }

        rateLimitingService.resetFailedAttempts(ip);

        return new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink());
    }
}