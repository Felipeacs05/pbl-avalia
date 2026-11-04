package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.dto.ProblemResponse;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorRecordRepository;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final RoomRepository roomRepository;
    private final AttendanceRepository attendanceRepository;
    private final SessionRoleAssignmentRepository sessionRoleAssignmentRepository;
    private final BehaviorRecordRepository behaviorRecordRepository;
    private final FeedbackRepository feedbackRepository;
    private final AssessmentRepository assessmentRepository;
    private final TutoringSessionRepository tutoringSessionRepository;
    private final CriterionRepository criterionRepository;
    private final PerformanceTableRepository performanceTableRepository;

    public ProblemService(ProblemRepository problemRepository, RoomRepository roomRepository) {
        this(
                problemRepository,
                roomRepository,
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
    public ProblemService(ProblemRepository problemRepository,
                          RoomRepository roomRepository,
                          AttendanceRepository attendanceRepository,
                          SessionRoleAssignmentRepository sessionRoleAssignmentRepository,
                          BehaviorRecordRepository behaviorRecordRepository,
                          FeedbackRepository feedbackRepository,
                          AssessmentRepository assessmentRepository,
                          TutoringSessionRepository tutoringSessionRepository,
                          CriterionRepository criterionRepository,
                          PerformanceTableRepository performanceTableRepository) {
        this.problemRepository = problemRepository;
        this.roomRepository = roomRepository;
        this.attendanceRepository = attendanceRepository;
        this.sessionRoleAssignmentRepository = sessionRoleAssignmentRepository;
        this.behaviorRecordRepository = behaviorRecordRepository;
        this.feedbackRepository = feedbackRepository;
        this.assessmentRepository = assessmentRepository;
        this.tutoringSessionRepository = tutoringSessionRepository;
        this.criterionRepository = criterionRepository;
        this.performanceTableRepository = performanceTableRepository;
    }

    @Transactional
    public ProblemResponse createProblem(UUID roomId, ProblemRequest request, UUID userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        validateTutorPermission(room, userId);

        Problem problem = new Problem();
        problem.setTitle(request.getTitle());
        problem.setRoom(room);
        problem.setCreatedAt(Instant.now());

        Problem savedProblem = problemRepository.save(problem);
        return new ProblemResponse(savedProblem);
    }

    @Transactional
    public ProblemResponse updateProblem(UUID problemId, ProblemRequest request, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        problem.setTitle(request.getTitle()); // Ou request.title()
        Problem updatedProblem = problemRepository.save(problem);
        return new ProblemResponse(updatedProblem);
    }

    @Transactional
    public void deleteProblem(UUID problemId, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        deleteProblemDependencies(problemId);

        // Importante: usar delete(problem) e não deleteById(problemId)
        problemRepository.delete(problem);
    }

    private void deleteProblemDependencies(UUID problemId) {
        if (attendanceRepository != null) {
            attendanceRepository.deleteBySessionProblemId(problemId);
        }
        if (sessionRoleAssignmentRepository != null) {
            sessionRoleAssignmentRepository.deleteBySessionProblemId(problemId);
        }
        if (behaviorRecordRepository != null) {
            behaviorRecordRepository.deleteBySessionProblemId(problemId);
        }
        if (feedbackRepository != null) {
            feedbackRepository.deleteByProblemId(problemId);
        }
        if (assessmentRepository != null) {
            assessmentRepository.deleteByProblemId(problemId);
        }
        if (tutoringSessionRepository != null) {
            tutoringSessionRepository.deleteByProblemId(problemId);
        }
        if (performanceTableRepository != null) {
            List<PerformanceTable> tables = performanceTableRepository.findByProblemId(problemId);
            for (PerformanceTable table : tables) {
                table.getCriteriaList().clear();
            }
            if (criterionRepository != null) {
                criterionRepository.deleteByPerformanceTableProblemId(problemId);
            }
            performanceTableRepository.deleteAll(tables);
        }
    }

    @Transactional(readOnly = true)
    public List<ProblemResponse> listProblems(UUID roomId) {
        return problemRepository.findAllByRoomIdOrderByCreatedAtAsc(roomId)
                .stream()
                .map(ProblemResponse::new)
                .toList();
    }

    private void validateTutorPermission(Room room, UUID userId) {
        if (room.getTutor() == null || !room.getTutor().getId().equals(userId)) {
            throw new SecurityException("Only the room Tutor can manage its problems.");
        }
    }
}
