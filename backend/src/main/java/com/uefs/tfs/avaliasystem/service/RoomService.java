package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.RoomDto;
import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.dto.RoomMemberResponse;
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
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final RateLimitingService rateLimitingService;

    @PersistenceContext
    private EntityManager entityManager;

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

        return new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink(), room.getTutor() != null ? room.getTutor().getName() : null, room.getTutor() != null ? room.getTutor().getId() : null);
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

        return new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink(), room.getTutor() != null ? room.getTutor().getName() : null, room.getTutor() != null ? room.getTutor().getId() : null);
    }

    @Transactional
    public void deleteRoom(UUID roomId, UUID tutorId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada"));

        if (!room.getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Apenas o Tutor da sala possui permissão para excluí-la.");
        }

        if (entityManager != null) {
            try {
                entityManager.createNativeQuery("DELETE FROM session_role_assignments WHERE session_id IN (SELECT ts.id FROM tutoring_sessions ts JOIN problems p ON ts.problem_id = p.id WHERE p.room_id = :roomId)").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM attendance WHERE session_id IN (SELECT ts.id FROM tutoring_sessions ts JOIN problems p ON ts.problem_id = p.id WHERE p.room_id = :roomId)").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM behavior_record WHERE session_id IN (SELECT ts.id FROM tutoring_sessions ts JOIN problems p ON ts.problem_id = p.id WHERE p.room_id = :roomId)").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM tutoring_sessions WHERE problem_id IN (SELECT p.id FROM problems p WHERE p.room_id = :roomId)").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM assessments WHERE problem_id IN (SELECT p.id FROM problems p WHERE p.room_id = :roomId)").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM feedbacks WHERE problem_id IN (SELECT p.id FROM problems p WHERE p.room_id = :roomId)").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM problems WHERE room_id = :roomId").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM group_members WHERE group_id IN (SELECT g.id FROM groups g WHERE g.room_id = :roomId)").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM groups WHERE room_id = :roomId").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM behavior_tags WHERE room_id = :roomId").setParameter("roomId", roomId).executeUpdate();
                entityManager.createNativeQuery("DELETE FROM room_members WHERE room_id = :roomId").setParameter("roomId", roomId).executeUpdate();
            } catch (Exception ignored) {
                // Continua para tentar a exclusão padrão caso alguma tabela não exista no esquema de teste
            }
        }

        roomRepository.delete(room);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(UUID userId) {
        return listRooms(userId, null);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(UUID userId, String role) {
        List<Room> rooms;
        if ("teacher".equalsIgnoreCase(role) || "tutor".equalsIgnoreCase(role)) {
            rooms = roomRepository.findByTutorId(userId);
        } else if ("student".equalsIgnoreCase(role) || "participant".equalsIgnoreCase(role)) {
            rooms = roomRepository.findRoomsByParticipantId(userId);
        } else {
            rooms = roomRepository.findAllByTutorOrActiveMember(userId);
        }

        return rooms.stream()
                .map(room -> new RoomResponse(
                        room.getId(),
                        room.getName(),
                        room.getAccessCode(),
                        room.getInviteLink(),
                        room.getTutor() != null ? room.getTutor().getName() : null,
                        room.getTutor() != null ? room.getTutor().getId() : null
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoom(UUID roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada"));
        return new RoomResponse(
                room.getId(),
                room.getName(),
                room.getAccessCode(),
                room.getInviteLink(),
                room.getTutor() != null ? room.getTutor().getName() : null,
                room.getTutor() != null ? room.getTutor().getId() : null
        );
    }

    @Transactional(readOnly = true)
    public List<RoomMemberResponse> listRoomMembers(UUID roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada"));

        List<RoomMemberResponse> members = new ArrayList<>();
        User tutor = room.getTutor();
        members.add(new RoomMemberResponse(
                tutor.getId(),
                tutor.getName(),
                Role.TUTOR
        ));

        roomMemberRepository.findAllByRoomIdAndActiveTrueOrderByUserNameAsc(roomId).stream()
                .filter(member -> !member.getUser().getId().equals(tutor.getId()))
                .map(member -> new RoomMemberResponse(
                        member.getUser().getId(),
                        member.getUser().getName(),
                        member.getRole()
                ))
                .forEach(members::add);

        return members;
    }

    @Transactional
    public void removeStudentFromRoom(UUID roomId, UUID studentId, UUID tutorId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada"));
        if (!room.getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Apenas o Tutor da sala possui permissão para gerenciar alunos.");
        }
        RoomMember member = roomMemberRepository.findByRoomIdAndUserId(roomId, studentId)
                .orElseThrow(() -> new IllegalArgumentException("Aluno não encontrado na sala"));
        member.setActive(false);
        member.setUnlinkedAt(java.time.Instant.now());
        roomMemberRepository.save(member);
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

        return new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink(), room.getTutor() != null ? room.getTutor().getName() : null, room.getTutor() != null ? room.getTutor().getId() : null);
    }
}
