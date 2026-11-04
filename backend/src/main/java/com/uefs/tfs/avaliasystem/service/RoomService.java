package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.RoomDto;
import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.dto.RoomMemberResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidAccessCodeException;
import com.uefs.tfs.avaliasystem.exception.TooManyAttemptsException;
import com.uefs.tfs.avaliasystem.exception.UserNotFoundException;
import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorRecordRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorTagRepository;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.GroupMemberRepository;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
import com.uefs.tfs.avaliasystem.repository.TeamRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final AttendanceRepository attendanceRepository;
    private final SessionRoleAssignmentRepository sessionRoleAssignmentRepository;
    private final BehaviorRecordRepository behaviorRecordRepository;
    private final BehaviorTagRepository behaviorTagRepository;
    private final FeedbackRepository feedbackRepository;
    private final AssessmentRepository assessmentRepository;
    private final TutoringSessionRepository tutoringSessionRepository;
    private final CriterionRepository criterionRepository;
    private final PerformanceTableRepository performanceTableRepository;
    private final ProblemRepository problemRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupRepository groupRepository;
    private final TeamRepository teamRepository;

    public RoomService(RoomRepository roomRepository,
                       UserRepository userRepository,
                       RoomMemberRepository roomMemberRepository,
                       RateLimitingService rateLimitingService) {
        this(
                roomRepository,
                userRepository,
                roomMemberRepository,
                rateLimitingService,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );
    }

    @Autowired
    public RoomService(RoomRepository roomRepository,
                       UserRepository userRepository,
                       RoomMemberRepository roomMemberRepository,
                       RateLimitingService rateLimitingService,
                       AttendanceRepository attendanceRepository,
                       SessionRoleAssignmentRepository sessionRoleAssignmentRepository,
                       BehaviorRecordRepository behaviorRecordRepository,
                       BehaviorTagRepository behaviorTagRepository,
                       FeedbackRepository feedbackRepository,
                       AssessmentRepository assessmentRepository,
                       TutoringSessionRepository tutoringSessionRepository,
                       CriterionRepository criterionRepository,
                       PerformanceTableRepository performanceTableRepository,
                       ProblemRepository problemRepository,
                       GroupMemberRepository groupMemberRepository,
                       GroupRepository groupRepository,
                       TeamRepository teamRepository) {
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.roomMemberRepository = roomMemberRepository;
        this.rateLimitingService = rateLimitingService;
        this.attendanceRepository = attendanceRepository;
        this.sessionRoleAssignmentRepository = sessionRoleAssignmentRepository;
        this.behaviorRecordRepository = behaviorRecordRepository;
        this.behaviorTagRepository = behaviorTagRepository;
        this.feedbackRepository = feedbackRepository;
        this.assessmentRepository = assessmentRepository;
        this.tutoringSessionRepository = tutoringSessionRepository;
        this.criterionRepository = criterionRepository;
        this.performanceTableRepository = performanceTableRepository;
        this.problemRepository = problemRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupRepository = groupRepository;
        this.teamRepository = teamRepository;
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

        deleteRoomDependencies(roomId);

        roomRepository.delete(room);
    }

    private void deleteRoomDependencies(UUID roomId) {
        if (attendanceRepository != null) {
            attendanceRepository.deleteBySessionProblemRoomId(roomId);
        }
        if (sessionRoleAssignmentRepository != null) {
            sessionRoleAssignmentRepository.deleteBySessionProblemRoomId(roomId);
        }
        if (behaviorRecordRepository != null) {
            behaviorRecordRepository.deleteBySessionProblemRoomId(roomId);
            behaviorRecordRepository.deleteByTagRoomId(roomId);
        }
        if (feedbackRepository != null) {
            feedbackRepository.deleteByProblemRoomId(roomId);
        }
        if (assessmentRepository != null) {
            assessmentRepository.deleteByProblemRoomId(roomId);
        }
        if (tutoringSessionRepository != null) {
            tutoringSessionRepository.deleteByProblemRoomId(roomId);
        }
        if (performanceTableRepository != null) {
            List<PerformanceTable> problemTables = performanceTableRepository.findByProblemRoomId(roomId);
            for (PerformanceTable table : problemTables) {
                table.getCriteriaList().clear();
            }
            if (criterionRepository != null) {
                criterionRepository.deleteByPerformanceTableProblemRoomId(roomId);
            }
            performanceTableRepository.deleteAll(problemTables);
        }
        if (problemRepository != null) {
            problemRepository.deleteByRoomId(roomId);
        }
        if (behaviorTagRepository != null) {
            behaviorTagRepository.deleteByRoomId(roomId);
        }
        if (performanceTableRepository != null) {
            List<PerformanceTable> roomTables = performanceTableRepository.findByRoomId(roomId);
            for (PerformanceTable table : roomTables) {
                table.getCriteriaList().clear();
            }
            if (criterionRepository != null) {
                criterionRepository.deleteByPerformanceTableRoomId(roomId);
            }
            performanceTableRepository.deleteAll(roomTables);
        }
        if (groupRepository != null) {
            List<Group> groups = groupRepository.findByRoomId(roomId);
            for (Group group : groups) {
                group.getMembers().clear();
            }
            if (groupMemberRepository != null) {
                groupMemberRepository.deleteByGroupRoomId(roomId);
            }
            groupRepository.deleteAll(groups);
        }
        if (roomMemberRepository != null) {
            roomMemberRepository.deleteByRoomId(roomId);
        }
        if (teamRepository != null) {
            teamRepository.deleteByRoomId(roomId);
        }
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(UUID userId) {
        return roomRepository.findAllByTutorOrActiveMember(userId).stream()
                .map(room -> new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink()))
                .collect(Collectors.toList());
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
