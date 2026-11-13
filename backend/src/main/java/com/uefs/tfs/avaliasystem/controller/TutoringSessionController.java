package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class TutoringSessionController {

    private final ProblemRepository problemRepository;
    private final TutoringSessionRepository tutoringSessionRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final AttendanceRepository attendanceRepository;
    private final SessionRoleAssignmentRepository sessionRoleAssignmentRepository;
    private final AssessmentRepository assessmentRepository;
    private final BehaviorRecordRepository behaviorRecordRepository;
    private final FeedbackRepository feedbackRepository;

    private static final Map<UUID, Set<UUID>> publishedGradesBySession = new ConcurrentHashMap<>();
    private static final Map<String, Map<String, Object>> performanceEvaluations = new ConcurrentHashMap<>();
    private static final Set<UUID> closedSessions = ConcurrentHashMap.newKeySet();
    private static final Map<String, List<String>> sessionStudentTags = new ConcurrentHashMap<>();

    public static boolean isSessionClosed(UUID sessionId) {
        return closedSessions.contains(sessionId);
    }

    @PostMapping("/problems/{problemId}/sessions")
    public ResponseEntity<Map<String, Object>> startSession(
            @PathVariable UUID problemId,
            Principal principal
    ) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        UUID tutorId = UUID.fromString(principal.getName());
        if (problem.getRoom().getTutor() == null || !problem.getRoom().getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Only the room tutor can start a tutoring session.");
        }

        TutoringSession session = new TutoringSession();
        session.setProblem(problem);
        TutoringSession saved = tutoringSessionRepository.save(session);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "sessionId", saved.getId().toString(),
                "id", saved.getId().toString(),
                "problemId", problem.getId().toString()
        ));
    }

    @PostMapping("/sessions/{sessionId}/end")
    public ResponseEntity<Map<String, Object>> endSession(@PathVariable UUID sessionId) {
        closedSessions.add(sessionId);
        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId.toString(),
                "status", "CLOSED",
                "isClosed", true
        ));
    }

    @PostMapping("/sessions/{sessionId}/close")
    public ResponseEntity<Map<String, Object>> closeSession(@PathVariable UUID sessionId) {
        return endSession(sessionId);
    }

    @PutMapping("/sessions/{sessionId}/students/{studentId}/tags")
    public ResponseEntity<Void> updateStudentTags(
            @PathVariable UUID sessionId,
            @PathVariable UUID studentId,
            @RequestBody List<String> tags) {
        sessionStudentTags.put(sessionId + ":" + studentId, tags != null ? tags : List.of());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/problems/{problemId}/sessions")
    public ResponseEntity<List<Map<String, Object>>> listSessions(@PathVariable UUID problemId) {
        List<TutoringSession> sessions = tutoringSessionRepository.findAllByProblemId(problemId);
        List<Map<String, Object>> result = sessions.stream()
                .map(s -> Map.<String, Object>of(
                        "sessionId", s.getId().toString(),
                        "id", s.getId().toString(),
                        "problemId", s.getProblem().getId().toString(),
                        "status", closedSessions.contains(s.getId()) ? "CLOSED" : "OPEN",
                        "isClosed", closedSessions.contains(s.getId())
                ))
                .toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, Object>> getSession(@PathVariable UUID sessionId) {
        TutoringSession session = tutoringSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        Problem problem = session.getProblem();
        Room room = problem.getRoom();
        List<RoomMember> members = roomMemberRepository.findByRoomIdAndActiveTrueAndRole(room.getId(), Role.STUDENT);

        List<Map<String, Object>> students = new ArrayList<>();
        for (RoomMember rm : members) {
            User student = rm.getUser();
            Map<String, Object> sMap = new HashMap<>();
            sMap.put("id", student.getId().toString());
            sMap.put("name", student.getName());
            sMap.put("avatarUrl", student.getProfilePictureUrl());

            Optional<Attendance> att = attendanceRepository.findBySessionIdAndStudentId(sessionId, student.getId());
            if (att.isPresent()) {
                sMap.put("status", att.get().getStatus().name());
                sMap.put("recordedAt", att.get().getRecordedAt().toString());
            } else {
                sMap.put("status", null);
                sMap.put("recordedAt", null);
            }

            Optional<SessionRoleAssignment> roleOpt = sessionRoleAssignmentRepository.findBySessionIdAndStudentId(sessionId, student.getId());
            sMap.put("role", roleOpt.map(r -> r.getRole().name()).orElse(null));
            List<String> studentTags = sessionStudentTags.getOrDefault(sessionId + ":" + student.getId(), List.of());
            sMap.put("tags", studentTags);
            students.add(sMap);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("sessionId", session.getId().toString());
        resp.put("id", session.getId().toString());
        resp.put("problemId", problem.getId().toString());
        resp.put("date", Instant.now().toString());
        resp.put("status", closedSessions.contains(sessionId) ? "CLOSED" : "OPEN");
        resp.put("isClosed", closedSessions.contains(sessionId));
        resp.put("students", students);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/sessions/{sessionId}/self-evaluations")
    public ResponseEntity<List<Map<String, Object>>> getSessionSelfEvaluations(@PathVariable UUID sessionId) {
        TutoringSession session = tutoringSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        Problem problem = session.getProblem();
        Room room = problem.getRoom();
        List<RoomMember> members = roomMemberRepository.findByRoomIdAndActiveTrueAndRole(room.getId(), Role.STUDENT);

        boolean isSelfReleased = Boolean.TRUE.equals(problem.getSelfAssessmentReleased());
        List<Map<String, Object>> result = new ArrayList<>();
        for (RoomMember rm : members) {
            User student = rm.getUser();
            Optional<Assessment> assessmentOpt = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(
                    problem.getId(), student.getId(), student.getId());

            String perfKey = sessionId + ":" + student.getId();
            Map<String, Object> perfData = performanceEvaluations.get(perfKey);
            Double perfCalculatedGrade = null;
            if (perfData != null && perfData.get("calculatedGrade") instanceof Number n) {
                perfCalculatedGrade = n.doubleValue();
            }

            List<Assessment> targetAssessments = assessmentRepository.findByProblemIdAndTargetId(problem.getId(), student.getId());
            List<Map<String, Object>> peerEvals = new ArrayList<>();
            Map<String, Object> selfEval = null;
            for (Assessment a : targetAssessments) {
                if (a.getEvaluator().getId().equals(student.getId())) {
                    selfEval = Map.of(
                            "score", a.getScore(),
                            "comments", a.getComment() != null ? a.getComment() : "",
                            "submitted", true
                    );
                } else {
                    Map<String, Object> p = new HashMap<>();
                    p.put("evaluatorName", a.getEvaluator().getName());
                    p.put("score", a.getScore());
                    p.put("comments", a.getComment() != null ? a.getComment() : "");
                    peerEvals.add(p);
                }
            }

            Map<String, Object> item = new HashMap<>();
            item.put("sessionId", session.getId().toString());
            item.put("problemId", problem.getId().toString());
            item.put("studentId", student.getId().toString());
            item.put("studentName", student.getName());
            item.put("avatarUrl", student.getProfilePictureUrl());
            item.put("peerEvaluations", peerEvals);
            item.put("selfEvaluation", selfEval);
            item.put("studentComment", assessmentOpt.map(Assessment::getComment).orElse(""));

            if (isSelfReleased) {
                if (assessmentOpt.isPresent()) {
                    Assessment a = assessmentOpt.get();
                    item.put("id", a.getId().toString());
                    item.put("status", "submitted");

                    boolean isModified = Boolean.TRUE.equals(a.getModifiedByTutor()) && a.getAdjustedGrade() != null;
                    Double finalScore = isModified ? a.getAdjustedGrade() : a.getScore();
                    Double origScore = a.getOriginalGrade() != null ? a.getOriginalGrade() : a.getScore();

                    item.put("score", finalScore);
                    item.put("nota_original", origScore);
                    item.put("originalGrade", origScore);
                    item.put("adjustedGrade", a.getAdjustedGrade());
                    item.put("ajustado_por_tutor", isModified);
                    item.put("modifiedByTutor", isModified);
                    item.put("justification", a.getJustification());
                } else {
                    item.put("id", "pending-" + student.getId().toString());
                    item.put("status", "pending");
                    item.put("score", null);
                    item.put("nota_original", null);
                    item.put("originalGrade", null);
                    item.put("adjustedGrade", null);
                    item.put("ajustado_por_tutor", false);
                    item.put("modifiedByTutor", false);
                    item.put("justification", null);
                }
            } else {
                boolean hasPerf = perfCalculatedGrade != null;
                boolean isModified = assessmentOpt.isPresent() && Boolean.TRUE.equals(assessmentOpt.get().getModifiedByTutor()) && assessmentOpt.get().getAdjustedGrade() != null;
                Double finalScore = isModified
                        ? assessmentOpt.get().getAdjustedGrade()
                        : (hasPerf ? perfCalculatedGrade : assessmentOpt.map(Assessment::getScore).orElse(null));
                Double origScore = hasPerf ? perfCalculatedGrade : assessmentOpt.map(Assessment::getScore).orElse(null);

                item.put("id", assessmentOpt.map(a -> a.getId().toString()).orElse("pending-" + student.getId().toString()));
                item.put("status", finalScore != null ? "submitted" : "pending");
                item.put("score", finalScore);
                item.put("nota_original", origScore);
                item.put("originalGrade", origScore);
                item.put("adjustedGrade", isModified ? assessmentOpt.get().getAdjustedGrade() : null);
                item.put("ajustado_por_tutor", isModified);
                item.put("modifiedByTutor", isModified);
                item.put("justification", assessmentOpt.map(Assessment::getJustification).orElse(null));
            }
            result.add(item);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/sessions/{sessionId}/evaluations/{studentId}")
    public ResponseEntity<Map<String, Object>> getStudentEvaluation(
            @PathVariable UUID sessionId,
            @PathVariable UUID studentId
    ) {
        String key = sessionId + ":" + studentId;
        Map<String, Object> data = performanceEvaluations.get(key);
        List<String> assignedTags = sessionStudentTags.getOrDefault(sessionId + ":" + studentId, Collections.emptyList());

        if (data == null) {
            data = new HashMap<>();
            data.put("sessionId", sessionId.toString());
            data.put("studentId", studentId.toString());
            data.put("studentName", "Aluno");
            data.put("criteria", Collections.emptyMap());
            data.put("tags", assignedTags);
            data.put("message", "");
            data.put("updatedAt", Instant.now().toString());
        } else {
            data = new HashMap<>(data);
            List<String> currentTags = new ArrayList<>();
            if (data.get("tags") instanceof List<?> list) {
                for (Object o : list) {
                    if (o != null) currentTags.add(o.toString());
                }
            }
            for (String t : assignedTags) {
                if (!currentTags.contains(t)) {
                    currentTags.add(t);
                }
            }
            data.put("tags", currentTags);
        }

        TutoringSession session = tutoringSessionRepository.findById(sessionId).orElse(null);
        if (session != null) {
            Problem problem = session.getProblem();
            List<Assessment> targetAssessments = assessmentRepository.findByProblemIdAndTargetId(problem.getId(), studentId);
            List<Map<String, Object>> peerEvals = new ArrayList<>();
            Map<String, Object> selfEval = null;
            for (Assessment a : targetAssessments) {
                if (a.getEvaluator().getId().equals(studentId)) {
                    selfEval = Map.of(
                            "score", a.getScore(),
                            "comments", a.getComment() != null ? a.getComment() : "",
                            "submitted", true
                    );
                } else {
                    Map<String, Object> p = new HashMap<>();
                    p.put("evaluatorName", a.getEvaluator().getName());
                    p.put("score", a.getScore());
                    p.put("comments", a.getComment() != null ? a.getComment() : "");
                    peerEvals.add(p);
                }
            }
            data.put("selfEvaluation", selfEval);
            data.put("peerEvaluations", peerEvals);
        }

        return ResponseEntity.ok(data);
    }

    @PutMapping("/sessions/{sessionId}/evaluations/{studentId}")
    public ResponseEntity<Map<String, Object>> saveStudentEvaluation(
            @PathVariable UUID sessionId,
            @PathVariable UUID studentId,
            @RequestBody Map<String, Object> body
    ) {
        String key = sessionId + ":" + studentId;
        Map<String, Object> data = new HashMap<>(body);
        data.put("sessionId", sessionId.toString());
        data.put("studentId", studentId.toString());
        data.put("updatedAt", Instant.now().toString());

        if (body.get("calculatedGrade") instanceof Number directGrade) {
            data.put("calculatedGrade", directGrade.doubleValue());
        } else {
            Object criteriaObj = body.get("criteria");
            if (criteriaObj instanceof Map<?, ?> criteriaMap && !criteriaMap.isEmpty()) {
                double totalScore = 0.0;
                int count = 0;
                for (Map.Entry<?, ?> entry : criteriaMap.entrySet()) {
                    if (entry.getValue() instanceof Number num) {
                        totalScore += num.doubleValue();
                        count++;
                    }
                }
                if (count > 0) {
                    double calculatedGrade = Math.round((totalScore / count / 10.0) * 10.0) / 10.0;
                    data.put("calculatedGrade", calculatedGrade);
                }
            }
        }

        if (body.get("tags") instanceof List<?> tagList) {
            List<String> strTags = new ArrayList<>();
            for (Object t : tagList) {
                if (t != null) strTags.add(t.toString());
            }
            if (!strTags.isEmpty()) {
                sessionStudentTags.put(key, strTags);
            }
        }

        performanceEvaluations.put(key, data);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/sessions/{sessionId}/grades/status")
    public ResponseEntity<Map<String, Object>> getGradesStatus(@PathVariable UUID sessionId) {
        Set<UUID> published = publishedGradesBySession.getOrDefault(sessionId, Collections.emptySet());
        List<String> publishedIds = published.stream().map(UUID::toString).toList();
        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId.toString(),
                "publishedStudentIds", publishedIds
        ));
    }

    @PostMapping("/sessions/{sessionId}/grades/publish")
    public ResponseEntity<Map<String, Object>> publishGrades(
            @PathVariable UUID sessionId,
            @RequestBody Map<String, List<String>> body
    ) {
        List<String> studentIds = body.getOrDefault("studentIds", List.of());
        Set<UUID> set = publishedGradesBySession.computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet());
        for (String idStr : studentIds) {
            try {
                set.add(UUID.fromString(idStr));
            } catch (Exception ignored) {}
        }
        List<String> publishedIds = set.stream().map(UUID::toString).toList();
        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId.toString(),
                "publishedStudentIds", publishedIds
        ));
    }

    @PostMapping("/sessions/{sessionId}/grades/unpublish")
    public ResponseEntity<Map<String, Object>> unpublishGrades(
            @PathVariable UUID sessionId,
            @RequestBody Map<String, List<String>> body
    ) {
        List<String> studentIds = body.getOrDefault("studentIds", List.of());
        Set<UUID> set = publishedGradesBySession.get(sessionId);
        if (set != null) {
            for (String idStr : studentIds) {
                try {
                    set.remove(UUID.fromString(idStr));
                } catch (Exception ignored) {}
            }
        }
        List<String> publishedIds = set != null ? set.stream().map(UUID::toString).toList() : List.of();
        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId.toString(),
                "publishedStudentIds", publishedIds
        ));
    }

    @GetMapping("/sessions/{sessionId}/students/{studentId}/summary")
    public ResponseEntity<Map<String, Object>> getStudentSessionSummary(
            @PathVariable UUID sessionId,
            @PathVariable UUID studentId
    ) {
        TutoringSession session = tutoringSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        Problem problem = session.getProblem();

        Set<UUID> published = publishedGradesBySession.getOrDefault(sessionId, Collections.emptySet());
        boolean isGradeReleased = published.contains(studentId);

        Optional<Assessment> assessmentOpt = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(
                problem.getId(), studentId, studentId);

        String perfKey = sessionId + ":" + studentId;
        Map<String, Object> perfData = performanceEvaluations.get(perfKey);
        Double perfCalculatedGrade = null;
        if (perfData != null && perfData.get("calculatedGrade") instanceof Number n) {
            perfCalculatedGrade = n.doubleValue();
        }

        Double grade = null;
        Double originalGrade = null;
        Double adjustedGrade = null;
        boolean isModifiedByTutor = false;
        String justification = null;

        boolean isSelfReleased = Boolean.TRUE.equals(problem.getSelfAssessmentReleased());
        if (isSelfReleased) {
            if (assessmentOpt.isPresent()) {
                Assessment a = assessmentOpt.get();
                if (Boolean.TRUE.equals(a.getModifiedByTutor()) && a.getAdjustedGrade() != null) {
                    grade = a.getAdjustedGrade();
                    adjustedGrade = a.getAdjustedGrade();
                    isModifiedByTutor = true;
                } else {
                    grade = a.getScore();
                }
                originalGrade = a.getOriginalGrade() != null ? a.getOriginalGrade() : a.getScore();
                justification = a.getJustification();
            }
        } else {
            if (assessmentOpt.isPresent() && Boolean.TRUE.equals(assessmentOpt.get().getModifiedByTutor()) && assessmentOpt.get().getAdjustedGrade() != null) {
                grade = assessmentOpt.get().getAdjustedGrade();
                adjustedGrade = assessmentOpt.get().getAdjustedGrade();
                isModifiedByTutor = true;
                originalGrade = perfCalculatedGrade != null ? perfCalculatedGrade : assessmentOpt.get().getOriginalGrade();
                justification = assessmentOpt.get().getJustification();
            } else if (perfCalculatedGrade != null) {
                grade = perfCalculatedGrade;
                originalGrade = perfCalculatedGrade;
            } else if (assessmentOpt.isPresent()) {
                grade = assessmentOpt.get().getScore();
                originalGrade = assessmentOpt.get().getScore();
            }
        }

        List<BehaviorRecord> records = behaviorRecordRepository.findBySessionIdAndStudentId(sessionId, studentId);
        List<String> quickTags = new ArrayList<>();
        for (BehaviorRecord rec : records) {
            if (rec.getTag() != null && rec.getTag().getName() != null) {
                quickTags.add(rec.getTag().getName());
            } else if (rec.getText() != null && !rec.getText().isBlank()) {
                quickTags.add(rec.getText());
            }
        }

        if (perfData != null && perfData.get("message") instanceof String msg && !msg.isBlank()) {
            quickTags.add(msg.trim());
        }
        if (perfData != null && perfData.get("tags") instanceof List<?> perfTags) {
            for (Object t : perfTags) {
                if (t instanceof String s && !s.isBlank() && !quickTags.contains(s)) {
                    quickTags.add(s);
                }
            }
        }

        List<String> assignedTags = sessionStudentTags.getOrDefault(sessionId + ":" + studentId, List.of());
        for (String t : assignedTags) {
            if (!quickTags.contains(t)) {
                quickTags.add(t);
            }
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("sessionId", sessionId.toString());
        resp.put("studentId", studentId.toString());
        resp.put("grade", grade);
        resp.put("originalGrade", originalGrade);
        resp.put("adjustedGrade", adjustedGrade);
        resp.put("isModifiedByTutor", isModifiedByTutor);
        resp.put("justification", justification);
        resp.put("isGradeReleased", isGradeReleased);
        resp.put("quickTags", quickTags);
        resp.put("problemTitle", problem.getTitle());
        resp.put("sessionDate", Instant.now().toString());
        resp.put("roomCode", problem.getRoom().getAccessCode());
        resp.put("status", closedSessions.contains(sessionId) ? "CLOSED" : "OPEN");
        resp.put("isClosed", closedSessions.contains(sessionId));

        return ResponseEntity.ok(resp);
    }
}
