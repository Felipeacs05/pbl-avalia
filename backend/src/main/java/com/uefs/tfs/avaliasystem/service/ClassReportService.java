package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.ProblemSummary;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.ReportWarning;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.StudentReportRow;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.WithdrawnStudentRow;
import com.uefs.tfs.avaliasystem.dto.ProblemReportResponse;
import com.uefs.tfs.avaliasystem.dto.ProblemReportResponse.StudentGradeRow;
import com.uefs.tfs.avaliasystem.dto.SessionReportResponse;
import com.uefs.tfs.avaliasystem.dto.SessionReportResponse.SessionStudentRow;
import com.uefs.tfs.avaliasystem.exception.ResourceNotFoundException;
import com.uefs.tfs.avaliasystem.model.Attendance;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class ClassReportService {

    private final RoomRepository roomRepository;
    private final ProblemRepository problemRepository;
    private final FeedbackRepository feedbackRepository;
    private final RoomMemberRepository roomMemberRepository;

    @Autowired(required = false)
    private TutoringSessionRepository tutoringSessionRepository;

    @Autowired(required = false)
    private AttendanceRepository attendanceRepository;

    @Autowired
    public ClassReportService(
            RoomRepository roomRepository,
            ProblemRepository problemRepository,
            FeedbackRepository feedbackRepository,
            RoomMemberRepository roomMemberRepository
    ) {
        this.roomRepository = roomRepository;
        this.problemRepository = problemRepository;
        this.feedbackRepository = feedbackRepository;
        this.roomMemberRepository = roomMemberRepository;
    }

    @Transactional(readOnly = true)
    public ClassReportResponse generateClassReport(UUID roomId, UUID tutorId) {
        Room room = requireRoomOwnedByTutor(roomId, tutorId);

        List<RoomMember> members = roomMemberRepository.findAllRelevantStudentsByRoomId(roomId);
        List<Problem> problems = problemRepository.findAllByRoomIdOrderByCreatedAtAsc(roomId);

        List<ReportWarning> warnings = new ArrayList<>();
        List<ProblemSummary> problemSummaries = new ArrayList<>();
        Map<UUID, Double> validWeights = new LinkedHashMap<>();
        Map<UUID, Map<UUID, Double>> gradesByProblemAndStudent = new LinkedHashMap<>();
        List<UUID> openProblemIds = new ArrayList<>();

        for (Problem problem : problems) {
            Double weight = problem.getWeight() != null ? problem.getWeight() : 1.0;
            problemSummaries.add(new ProblemSummary(problem.getId(), problem.getTitle(), weight));

            boolean weightValid = !Double.isNaN(weight) && !Double.isInfinite(weight) && weight >= 0.0;
            if (!weightValid) {
                warnings.add(new ReportWarning(
                        ReportWarning.INVALID_WEIGHT,
                        problem.getId(),
                        null,
                        "Peso inválido no " + problem.getTitle() + ": o problema foi desconsiderado no cálculo."
                ));
            } else {
                validWeights.put(problem.getId(), weight);
            }

            List<Feedback> feedbacks = feedbackRepository.findByProblemId(problem.getId());
            Map<UUID, Double> studentGrades = new LinkedHashMap<>();
            if (feedbacks != null) {
                for (Feedback feedback : feedbacks) {
                    if (feedback.getStudent() == null || feedback.getStudent().getId() == null) {
                        continue;
                    }
                    UUID studentId = feedback.getStudent().getId();
                    Double grade = feedback.getGrade();
                    if (grade == null) {
                        continue;
                    }
                    if (Double.isNaN(grade) || Double.isInfinite(grade) || grade < 0.0 || grade > 10.0) {
                        warnings.add(new ReportWarning(
                                ReportWarning.INVALID_GRADE,
                                problem.getId(),
                                studentId,
                                "Nota inválida para o aluno no " + problem.getTitle() + ": a nota foi desconsiderada no cálculo."
                        ));
                        continue;
                    }
                    studentGrades.put(studentId, grade);
                }
            }

            gradesByProblemAndStudent.put(problem.getId(), studentGrades);
            if (studentGrades.isEmpty()) {
                openProblemIds.add(problem.getId());
            }
        }

        List<RoomMember> sortedMembers = members.stream()
                .filter(m -> m.getUser() != null && m.getUser().getId() != null)
                .sorted(Comparator.comparing(
                        m -> m.getUser().getName() != null ? m.getUser().getName() : "",
                        String.CASE_INSENSITIVE_ORDER
                ))
                .toList();

        List<StudentReportRow> activeStudents = new ArrayList<>();
        List<WithdrawnStudentRow> withdrawnStudents = new ArrayList<>();

        for (RoomMember member : sortedMembers) {
            UUID studentId = member.getUser().getId();
            String studentName = member.getUser().getName();
            Map<UUID, Double> studentGrades = new LinkedHashMap<>();
            List<UUID> pendingProblemIds = new ArrayList<>();

            double weightedSum = 0.0;
            double totalWeight = 0.0;

            for (Problem problem : problems) {
                UUID problemId = problem.getId();
                Map<UUID, Double> problemGrades = gradesByProblemAndStudent.getOrDefault(problemId, Map.of());
                Double grade = problemGrades.get(studentId);
                if (grade != null) {
                    studentGrades.put(problemId, grade);
                    Double weight = validWeights.get(problemId);
                    if (weight != null && weight > 0.0) {
                        weightedSum += grade * weight;
                        totalWeight += weight;
                    }
                } else if (!openProblemIds.contains(problemId)) {
                    pendingProblemIds.add(problemId);
                }
            }

            Double average = totalWeight > 0.0 ? (weightedSum / totalWeight) : null;

            if (member.isActive()) {
                activeStudents.add(new StudentReportRow(
                        studentId,
                        studentName,
                        studentGrades,
                        average,
                        pendingProblemIds
                ));
            } else if (!studentGrades.isEmpty()) {
                withdrawnStudents.add(new WithdrawnStudentRow(
                        studentId,
                        studentName,
                        member.getUnlinkedAt(),
                        studentGrades,
                        average
                ));
            }
        }

        return new ClassReportResponse(
                room.getId(),
                room.getName(),
                problemSummaries,
                activeStudents,
                openProblemIds,
                withdrawnStudents,
                warnings
        );
    }

    @Transactional(readOnly = true)
    public ProblemReportResponse generateProblemReport(UUID roomId, UUID problemId, UUID tutorId) {
        Room room = requireRoomOwnedByTutor(roomId, tutorId);

        List<Problem> problems = problemRepository.findAllByRoomIdOrderByCreatedAtAsc(roomId);
        Problem target = problems.stream()
                .filter(p -> problemId.equals(p.getId()))
                .findFirst()
                .orElseGet(() -> problemRepository.findById(problemId)
                        .filter(p -> p.getRoom() != null && roomId.equals(p.getRoom().getId()))
                        .orElseThrow(() -> new ResourceNotFoundException("Problema não encontrado")));

        Double weight = target.getWeight() != null ? target.getWeight() : 1.0;
        ProblemSummary summary = new ProblemSummary(target.getId(), target.getTitle(), weight);
        List<ReportWarning> warnings = new ArrayList<>();

        if (Double.isNaN(weight) || Double.isInfinite(weight) || weight < 0.0) {
            warnings.add(new ReportWarning(
                    ReportWarning.INVALID_WEIGHT,
                    target.getId(),
                    null,
                    "Peso inválido no " + target.getTitle() + ": o problema foi desconsiderado no cálculo."
            ));
        }

        List<Feedback> feedbacks = feedbackRepository.findByProblemId(target.getId());
        Map<UUID, Double> gradesByStudent = new LinkedHashMap<>();
        if (feedbacks != null) {
            for (Feedback feedback : feedbacks) {
                if (feedback.getStudent() == null || feedback.getStudent().getId() == null) {
                    continue;
                }
                UUID studentId = feedback.getStudent().getId();
                Double grade = feedback.getGrade();
                if (grade == null) {
                    continue;
                }
                if (Double.isNaN(grade) || Double.isInfinite(grade) || grade < 0.0 || grade > 10.0) {
                    warnings.add(new ReportWarning(
                            ReportWarning.INVALID_GRADE,
                            target.getId(),
                            studentId,
                            "Nota inválida para o aluno no " + target.getTitle()
                    ));
                    continue;
                }
                gradesByStudent.put(studentId, grade);
            }
        }

        boolean open = gradesByStudent.isEmpty();
        List<RoomMember> members = roomMemberRepository.findAllRelevantStudentsByRoomId(roomId);
        List<StudentGradeRow> studentRows = new ArrayList<>();
        double sum = 0.0;
        int count = 0;

        for (RoomMember member : members) {
            if (!member.isActive() || member.getUser() == null) {
                continue;
            }
            UUID studentId = member.getUser().getId();
            Double grade = gradesByStudent.get(studentId);
            boolean pending = !open && grade == null;
            studentRows.add(new StudentGradeRow(studentId, member.getUser().getName(), grade, pending));
            if (grade != null) {
                sum += grade;
                count++;
            }
        }

        Double classAverage = count > 0 ? (sum / count) : null;
        return new ProblemReportResponse(
                room.getId(),
                room.getName(),
                summary,
                open,
                studentRows,
                classAverage,
                warnings
        );
    }

    @Transactional(readOnly = true)
    public SessionReportResponse generateSessionReport(UUID roomId, UUID sessionId, UUID tutorId) {
        Room room = requireRoomOwnedByTutor(roomId, tutorId);

        if (tutoringSessionRepository == null) {
            throw new ResourceNotFoundException("Sessão não encontrada");
        }

        TutoringSession session = tutoringSessionRepository.findById(sessionId)
                .filter(s -> s.getProblem() != null
                        && s.getProblem().getRoom() != null
                        && roomId.equals(s.getProblem().getRoom().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada"));

        Problem problem = session.getProblem();
        Double weight = problem.getWeight() != null ? problem.getWeight() : 1.0;
        ProblemSummary summary = new ProblemSummary(problem.getId(), problem.getTitle(), weight);
        List<ReportWarning> warnings = new ArrayList<>();

        List<Feedback> feedbacks = feedbackRepository.findByProblemId(problem.getId());
        Map<UUID, Double> gradesByStudent = new LinkedHashMap<>();
        if (feedbacks != null) {
            for (Feedback feedback : feedbacks) {
                if (feedback.getStudent() != null && feedback.getStudent().getId() != null && feedback.getGrade() != null) {
                    gradesByStudent.put(feedback.getStudent().getId(), feedback.getGrade());
                }
            }
        }

        List<RoomMember> members = roomMemberRepository.findAllRelevantStudentsByRoomId(roomId);
        List<SessionStudentRow> studentRows = new ArrayList<>();

        for (RoomMember member : members) {
            if (!member.isActive() || member.getUser() == null) {
                continue;
            }
            UUID studentId = member.getUser().getId();
            Optional<Attendance> attendanceOpt = attendanceRepository != null
                    ? attendanceRepository.findBySessionIdAndStudentId(sessionId, studentId)
                    : Optional.empty();

            studentRows.add(new SessionStudentRow(
                    studentId,
                    member.getUser().getName(),
                    attendanceOpt.map(Attendance::getStatus).orElse(null),
                    attendanceOpt.map(Attendance::getRecordedAt).orElse(null),
                    gradesByStudent.get(studentId)
            ));
        }

        return new SessionReportResponse(
                room.getId(),
                room.getName(),
                session.getId(),
                summary,
                studentRows,
                warnings
        );
    }

    private Room requireRoomOwnedByTutor(UUID roomId, UUID tutorId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Sala não encontrada"));
        if (room.getTutor() == null || room.getTutor().getId() == null || !room.getTutor().getId().equals(tutorId)) {
            throw new AccessDeniedException("Apenas o tutor responsável pela sala pode emitir o relatório.");
        }
        return room;
    }
}
