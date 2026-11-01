package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentRequest;
import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentResponse;
import com.uefs.tfs.avaliasystem.exception.SessionRoleConflictException;
import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionRoleAssignmentService {

    private final SessionRoleAssignmentRepository sessionRoleAssignmentRepository;
    private final TutoringSessionRepository tutoringSessionRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final UserRepository userRepository;
    private final PerformanceTableService performanceTableService;

    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode atribuir papéis da sessão.";
    private static final String ROLE_TAKEN_MESSAGE = "Este papel já foi atribuído a outro aluno nesta sessão.";
    private static final String STUDENT_HAS_ROLE_MESSAGE = "Este aluno já possui um papel nesta sessão.";
    private static final String NOT_ACTIVE_STUDENT_MESSAGE = "O aluno não possui vínculo ativo com a sala informada";

    @Transactional
    public SessionRoleAssignmentResponse assignRole(
            UUID sessionId,
            SessionRole role,
            SessionRoleAssignmentRequest request,
            UUID requesterId
    ) {
        TutoringSession session = tutoringSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada com id: " + sessionId));

        // 1. Verifica posse da sala (IDOR) antes de qualquer leitura de vínculo, aluno ou papel
        UUID roomTutorId = session.getProblem().getRoom().getTutor().getId();
        if (!roomTutorId.equals(requesterId)) {
            throw new SecurityException(NOT_TUTOR_MESSAGE);
        }

        // 2. Verifica se o aluno possui vínculo ativo na sala da sessão
        UUID roomId = session.getProblem().getRoom().getId();
        if (!roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(roomId, request.getStudentId())) {
            throw new IllegalArgumentException(NOT_ACTIVE_STUDENT_MESSAGE);
        }

        // 3. Verifica se o papel já foi atribuído a outro aluno nesta sessão
        if (sessionRoleAssignmentRepository.existsBySessionIdAndRole(sessionId, role)) {
            throw new SessionRoleConflictException(ROLE_TAKEN_MESSAGE);
        }

        // 4. Verifica se o aluno já possui outro papel nesta sessão
        if (sessionRoleAssignmentRepository.existsBySessionIdAndStudentId(sessionId, request.getStudentId())) {
            throw new SessionRoleConflictException(STUDENT_HAS_ROLE_MESSAGE);
        }

        // 5. Carrega dados do aluno
        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Aluno não encontrado"));

        // 6. Grava atribuição do papel
        SessionRoleAssignment assignment = new SessionRoleAssignment();
        assignment.setSession(session);
        assignment.setStudent(student);
        assignment.setRole(role);
        assignment.setExtraGrade(request.getExtraGrade());

        SessionRoleAssignment saved = sessionRoleAssignmentRepository.save(assignment);

        return new SessionRoleAssignmentResponse(
                saved.getId(),
                saved.getSession().getId(),
                student.getId(),
                student.getName(),
                saved.getRole(),
                saved.getExtraGrade()
        );
    }

    public double calculateSessionGrade(
            UUID sessionId,
            UUID studentId,
            UUID tableId,
            Map<UUID, Double> gradesByCriterion
    ) {
        double formulaGrade = performanceTableService.calculateFinalGrade(tableId, gradesByCriterion);

        Optional<SessionRoleAssignment> assignmentOpt =
                sessionRoleAssignmentRepository.findBySessionIdAndStudentId(sessionId, studentId);

        if (assignmentOpt.isPresent()) {
            double extraGrade = assignmentOpt.get().getExtraGrade() != null ? assignmentOpt.get().getExtraGrade() : 0.0;
            return Math.min(10.0, formulaGrade + extraGrade);
        }

        return formulaGrade;
    }
}
