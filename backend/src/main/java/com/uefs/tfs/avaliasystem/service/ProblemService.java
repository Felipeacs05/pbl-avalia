package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.dto.ProblemResponse;
import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Attendance;
import com.uefs.tfs.avaliasystem.model.BehaviorRecord;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorRecordRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final RoomRepository roomRepository;
    private final Map<UUID, Set<String>> publishedGradesBySession = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private TutoringSessionRepository tutoringSessionRepository;

    @Autowired(required = false)
    private RoomMemberRepository roomMemberRepository;

    @Autowired(required = false)
    private AssessmentRepository assessmentRepository;

    @Autowired(required = false)
    private BehaviorRecordRepository behaviorRecordRepository;

    @Autowired(required = false)
    private AttendanceRepository attendanceRepository;

    @Autowired(required = false)
    private SessionRoleAssignmentRepository sessionRoleAssignmentRepository;

    public ProblemService(ProblemRepository problemRepository, RoomRepository roomRepository) {
        this.problemRepository = problemRepository;
        this.roomRepository = roomRepository;
    }

    public ProblemResponse createProblem(UUID roomId, ProblemRequest request, UUID userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        validateTutorPermission(room, userId);

        Problem problem = new Problem();
        problem.setTitle(request.getTitle());
        if (request.getDescription() != null) {
            problem.setDescription(request.getDescription());
        }
        problem.setRoom(room);
        problem.setCreatedAt(Instant.now());

        Problem savedProblem = problemRepository.save(problem);
        return new ProblemResponse(savedProblem);
    }

    public ProblemResponse updateProblem(UUID problemId, ProblemRequest request, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        problem.setTitle(request.getTitle());
        if (request.getDescription() != null) {
            problem.setDescription(request.getDescription());
        }
        Problem updatedProblem = problemRepository.save(problem);
        return new ProblemResponse(updatedProblem);
    }

    public void deleteProblem(UUID problemId, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        // Importante: usar delete(problem) e não deleteById(problemId)
        problemRepository.delete(problem);
    }

    public List<ProblemResponse> listProblems(UUID roomId) {
        return problemRepository.findAllByRoomIdOrderByCreatedAtAsc(roomId)
                .stream()
                .map(ProblemResponse::new)
                .toList();
    }

    public ProblemResponse getProblemById(UUID problemId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));
        return new ProblemResponse(problem);
    }

    public Map<String, Object> getEvaluationStatusMap(UUID problemId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));
        return buildEvaluationStatusPayload(problem);
    }

    @Transactional
    public Map<String, Object> releaseEvaluation(
            UUID problemId,
            String type,
            boolean keepOthers,
            UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        if (type == null || type.isBlank()) {
            problem.setSelfAssessmentReleased(false);
            problem.setPeerAssessmentReleased(false);
        } else if ("self_evaluation".equals(type)) {
            problem.setSelfAssessmentReleased(true);
            if (!keepOthers) {
                problem.setPeerAssessmentReleased(false);
            }
        } else if ("peer_evaluation".equals(type)) {
            problem.setPeerAssessmentReleased(true);
            if (!keepOthers) {
                problem.setSelfAssessmentReleased(false);
            }
        }

        Problem saved = problemRepository.save(problem);
        return buildEvaluationStatusPayload(saved);
    }

    private Map<String, Object> buildEvaluationStatusPayload(Problem problem) {
        boolean selfOpen = Boolean.TRUE.equals(problem.getSelfAssessmentReleased());
        boolean peerOpen = Boolean.TRUE.equals(problem.getPeerAssessmentReleased());
        List<String> activeTypes = new ArrayList<>();
        if (selfOpen) {
            activeTypes.add("self_evaluation");
        }
        if (peerOpen) {
            activeTypes.add("peer_evaluation");
        }
        String activeType = activeTypes.isEmpty() ? null : activeTypes.get(0);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("problemId", problem.getId().toString());
        payload.put("isReleased", !activeTypes.isEmpty());
        payload.put("activeType", activeType);
        payload.put("activeTypes", activeTypes);
        payload.put("selfEvaluationOpen", selfOpen);
        payload.put("peerEvaluationOpen", peerOpen);
        payload.put("selfAssessmentReleased", selfOpen);
        payload.put("peerAssessmentReleased", peerOpen);
        payload.put("updatedAt", Instant.now().toString());
        return payload;
    }

    public List<Map<String, Object>> getSessionSelfEvaluations(UUID sessionId) {
        if (tutoringSessionRepository == null || roomMemberRepository == null || assessmentRepository == null) {
            return List.of();
        }

        Optional<TutoringSession> sessionOpt = tutoringSessionRepository.findById(sessionId);
        Problem problem;
        if (sessionOpt.isPresent()) {
            problem = sessionOpt.get().getProblem();
        } else {
            Optional<Problem> probOpt = problemRepository.findById(sessionId);
            if (probOpt.isEmpty()) {
                return List.of();
            }
            problem = probOpt.get();
        }

        UUID roomId = problem.getRoom().getId();
        List<RoomMember> students = roomMemberRepository.findByRoomIdAndActiveTrueAndRole(roomId, Role.STUDENT);
        List<Assessment> assessments = assessmentRepository.findByProblemId(problem.getId());

        Map<UUID, Assessment> selfAssessmentsByStudent = new HashMap<>();
        for (Assessment a : assessments) {
            if (a.getEvaluator() != null && a.getTarget() != null
                    && a.getEvaluator().getId().equals(a.getTarget().getId())) {
                selfAssessmentsByStudent.put(a.getEvaluator().getId(), a);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (RoomMember member : students) {
            User student = member.getUser();
            Assessment a = selfAssessmentsByStudent.get(student.getId());
            Map<String, Object> item = new LinkedHashMap<>();
            if (a != null) {
                boolean modified = Boolean.TRUE.equals(a.getModifiedByTutor());
                item.put("id", a.getId().toString());
                item.put("studentId", student.getId().toString());
                item.put("studentName", student.getName());
                item.put("avatarUrl", student.getPhotoUrl());
                item.put("sessionId", sessionId.toString());
                item.put("status", "submitted");
                item.put("score", a.getScore());
                item.put("comment", a.getComment() != null ? a.getComment() : "");
                item.put("modifiedByTutor", modified);
                item.put("ajustado_por_tutor", modified);
                item.put("originalGrade", a.getOriginalGrade());
                item.put("nota_original", a.getOriginalGrade());
                item.put("adjustedGrade", a.getAdjustedGrade());
                item.put("justification", a.getJustification());
            } else {
                item.put("id", "pending-" + student.getId());
                item.put("studentId", student.getId().toString());
                item.put("studentName", student.getName());
                item.put("avatarUrl", student.getPhotoUrl());
                item.put("sessionId", sessionId.toString());
                item.put("status", "pending");
                item.put("score", null);
                item.put("comment", "");
                item.put("modifiedByTutor", false);
                item.put("ajustado_por_tutor", false);
                item.put("originalGrade", null);
                item.put("nota_original", null);
                item.put("adjustedGrade", null);
                item.put("justification", null);
            }
            result.add(item);
        }
        return result;
    }

    public Map<String, Object> getStudentSessionSummary(UUID sessionId, UUID problemIdParam, UUID studentId) {
        UUID resolvedProblemId = problemIdParam;
        if (resolvedProblemId == null && tutoringSessionRepository != null) {
            resolvedProblemId = tutoringSessionRepository.findById(sessionId)
                    .map(s -> s.getProblem().getId())
                    .orElse(null);
        }

        Map<String, Object> assessmentMap = new LinkedHashMap<>();
        assessmentMap.put("hasAssessment", false);
        assessmentMap.put("id", "");
        assessmentMap.put("studentId", studentId.toString());
        assessmentMap.put("studentName", "Estudante");
        assessmentMap.put("score", 0.0);
        assessmentMap.put("comment", "");
        assessmentMap.put("modifiedByTutor", false);
        assessmentMap.put("ajustado_por_tutor", false);
        assessmentMap.put("originalGrade", null);
        assessmentMap.put("nota_original", null);
        assessmentMap.put("adjustedGrade", null);
        assessmentMap.put("justification", null);

        if (resolvedProblemId != null && assessmentRepository != null) {
            Optional<Assessment> aOpt = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(
                    resolvedProblemId, studentId, studentId);
            if (aOpt.isPresent()) {
                Assessment a = aOpt.get();
                boolean modified = Boolean.TRUE.equals(a.getModifiedByTutor());
                assessmentMap.put("hasAssessment", true);
                assessmentMap.put("id", a.getId().toString());
                assessmentMap.put("studentId", studentId.toString());
                assessmentMap.put("studentName", a.getEvaluator().getName());
                assessmentMap.put("score", a.getScore() != null ? a.getScore() : 0.0);
                assessmentMap.put("comment", a.getComment() != null ? a.getComment() : "");
                assessmentMap.put("modifiedByTutor", modified);
                assessmentMap.put("ajustado_por_tutor", modified);
                assessmentMap.put("originalGrade", a.getOriginalGrade());
                assessmentMap.put("nota_original", a.getOriginalGrade());
                assessmentMap.put("adjustedGrade", a.getAdjustedGrade());
                assessmentMap.put("justification", a.getJustification());
            }
        }

        List<String> positiveTags = new ArrayList<>();
        List<String> negativeTags = new ArrayList<>();
        List<String> comments = new ArrayList<>();

        if (behaviorRecordRepository != null && sessionId != null) {
            List<BehaviorRecord> records = behaviorRecordRepository.findBySessionIdAndStudentId(sessionId, studentId);
            for (BehaviorRecord record : records) {
                if (record.getTag() != null && record.getTag().getName() != null) {
                    positiveTags.add(record.getTag().getName());
                }
                if (record.getText() != null && !record.getText().isBlank()) {
                    comments.add(record.getText().trim());
                }
            }
        }

        Map<String, Object> quickTags = new LinkedHashMap<>();
        quickTags.put("positive", positiveTags);
        quickTags.put("negative", negativeTags);
        quickTags.put("comments", comments);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("assessment", assessmentMap);
        response.put("quickTags", quickTags);
        return response;
    }

    public Map<String, Object> createOrGetSession(UUID problemId, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        if (tutoringSessionRepository == null) {
            return Map.of(
                    "id", UUID.randomUUID().toString(),
                    "problemId", problemId.toString(),
                    "status", "OPEN"
            );
        }

        TutoringSession session = new TutoringSession();
        session.setProblem(problem);
        TutoringSession saved = tutoringSessionRepository.save(session);

        return Map.of(
                "id", saved.getId().toString(),
                "problemId", problemId.toString(),
                "status", "OPEN"
        );
    }

    public List<Map<String, Object>> listSessions(UUID problemId) {
        if (tutoringSessionRepository == null) {
            return List.of();
        }
        return tutoringSessionRepository.findByProblemId(problemId)
                .stream()
                .map(s -> Map.<String, Object>of(
                        "id", s.getId().toString(),
                        "problemId", problemId.toString(),
                        "status", "OPEN"
                ))
                .toList();
    }

    public Map<String, Object> getSessionRoster(UUID sessionId) {
        Map<String, Object> roster = new LinkedHashMap<>();
        roster.put("id", sessionId.toString());
        roster.put("date", Instant.now().toString());

        if (tutoringSessionRepository == null || roomMemberRepository == null) {
            roster.put("students", List.of());
            return roster;
        }

        Optional<TutoringSession> sessionOpt = tutoringSessionRepository.findById(sessionId);
        if (sessionOpt.isEmpty()) {
            roster.put("students", List.of());
            return roster;
        }

        UUID roomId = sessionOpt.get().getProblem().getRoom().getId();
        List<RoomMember> members = roomMemberRepository.findByRoomIdAndActiveTrueAndRole(roomId, Role.STUDENT);
        List<Map<String, Object>> students = new ArrayList<>();

        for (RoomMember member : members) {
            User u = member.getUser();
            Map<String, Object> studentMap = new LinkedHashMap<>();
            studentMap.put("id", u.getId().toString());
            studentMap.put("name", u.getName());
            studentMap.put("avatarUrl", u.getPhotoUrl());

            if (attendanceRepository != null) {
                Optional<Attendance> attOpt = attendanceRepository.findBySessionIdAndStudentId(sessionId, u.getId());
                if (attOpt.isPresent()) {
                    studentMap.put("status", attOpt.get().getStatus().name());
                    if (attOpt.get().getRecordedAt() != null) {
                        studentMap.put("recordedAt", attOpt.get().getRecordedAt().toString());
                    }
                }
            }

            if (sessionRoleAssignmentRepository != null) {
                Optional<SessionRoleAssignment> roleOpt =
                        sessionRoleAssignmentRepository.findBySessionIdAndStudentId(sessionId, u.getId());
                if (roleOpt.isPresent()) {
                    studentMap.put("role", roleOpt.get().getRole().name());
                    studentMap.put("extraGrade", roleOpt.get().getExtraGrade());
                }
            }

            if (behaviorRecordRepository != null) {
                List<String> tags = behaviorRecordRepository.findBySessionIdAndStudentId(sessionId, u.getId())
                        .stream()
                        .filter(r -> r.getTag() != null && r.getTag().getName() != null)
                        .map(r -> r.getTag().getName())
                        .toList();
                if (!tags.isEmpty()) {
                    studentMap.put("tags", tags);
                }
            }

            students.add(studentMap);
        }

        roster.put("students", students);
        return roster;
    }

    public Map<String, Object> getSessionGradesStatus(UUID sessionId) {
        Set<String> published = publishedGradesBySession.getOrDefault(sessionId, Set.of());
        return Map.of(
                "sessionId", sessionId.toString(),
                "publishedStudentIds", new ArrayList<>(published)
        );
    }

    public Map<String, Object> publishSessionGrades(UUID sessionId, List<String> studentIds) {
        Set<String> published = publishedGradesBySession.computeIfAbsent(sessionId, k -> new LinkedHashSet<>());
        if (studentIds != null) {
            published.addAll(studentIds);
        }
        return getSessionGradesStatus(sessionId);
    }

    public Map<String, Object> unpublishSessionGrades(UUID sessionId, List<String> studentIds) {
        Set<String> published = publishedGradesBySession.computeIfAbsent(sessionId, k -> new LinkedHashSet<>());
        if (studentIds != null) {
            studentIds.forEach(published::remove);
        }
        return getSessionGradesStatus(sessionId);
    }

    private void validateTutorPermission(Room room, UUID userId) {
        if (room.getTutor() == null || !room.getTutor().getId().equals(userId)) {
            throw new SecurityException("Only the room Tutor can manage its problems.");
        }
    }
}
