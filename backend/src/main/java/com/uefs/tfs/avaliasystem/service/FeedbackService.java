package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.FeedbackBatchDTO;
import com.uefs.tfs.avaliasystem.dto.FeedbackRequest;
import com.uefs.tfs.avaliasystem.dto.FeedbackResponse;
import com.uefs.tfs.avaliasystem.exception.ProblemNotFoundException;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final ProblemRepository problemRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final FeedbackRepository feedbackRepository;

    @Transactional
    public FeedbackResponse sendFeedback(UUID problemId, UUID tutorId, FeedbackRequest request) {
        validate(request);
        Problem problem = loadProblemOwnedByTutor(problemId, tutorId);

        RoomMember member = roomMemberRepository
                .findByRoomIdAndUserId(problem.getRoom().getId(), request.studentId())
                .filter(this::isActiveStudent)
                .orElseThrow(() -> new IllegalArgumentException("O aluno não pertence a esta sala"));

        Feedback saved = feedbackRepository.save(build(problem, member.getUser(), request));
        return FeedbackResponse.from(saved);
    }

    @Transactional
    public List<FeedbackResponse> sendBatchFeedback(UUID problemId, UUID tutorId, FeedbackBatchDTO batch) {
        if (batch == null || batch.feedbacks() == null || batch.feedbacks().isEmpty()) {
            throw new IllegalArgumentException("A lista de feedbacks não pode estar vazia");
        }
        // Valida todos os itens antes de tocar no banco: o lote é atômico
        batch.feedbacks().forEach(this::validate);

        Problem problem = loadProblemOwnedByTutor(problemId, tutorId);

        Set<UUID> studentIds = batch.feedbacks().stream()
                .map(FeedbackRequest::studentId)
                .collect(Collectors.toSet());

        // Uma única consulta para validar todos os alunos da turma
        Map<UUID, User> students = roomMemberRepository
                .findByRoomIdAndUserIdIn(problem.getRoom().getId(), studentIds).stream()
                .filter(this::isActiveStudent)
                .collect(Collectors.toMap(m -> m.getUser().getId(), RoomMember::getUser, (a, b) -> a));

        if (!students.keySet().containsAll(studentIds)) {
            throw new IllegalArgumentException("Um ou mais alunos não pertencem a esta sala");
        }

        List<Feedback> feedbacks = batch.feedbacks().stream()
                .map(r -> build(problem, students.get(r.studentId()), r))
                .toList();

        // Uma única operação em lote em vez de save() dentro de um loop
        return feedbackRepository.saveAll(feedbacks).stream()
                .map(FeedbackResponse::from)
                .toList();
    }

    private void validate(FeedbackRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("O feedback é obrigatório");
        }
        if (request.studentId() == null) {
            throw new IllegalArgumentException("O aluno é obrigatório");
        }
        if (request.grade() == null) {
            throw new IllegalArgumentException("A nota é obrigatória");
        }
        if (request.grade() < 0 || request.grade() > 10) {
            throw new IllegalArgumentException("A nota deve estar entre 0 e 10");
        }
        if (request.text() == null || request.text().isBlank()) {
            throw new IllegalArgumentException("O texto do feedback não pode ser vazio");
        }
    }

    private Problem loadProblemOwnedByTutor(UUID problemId, UUID tutorId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ProblemNotFoundException("Problema não encontrado"));
        if (!problem.getRoom().getTutor().getId().equals(tutorId)) {
            throw new AccessDeniedException("Acesso negado: apenas o tutor da sala pode enviar feedbacks");
        }
        return problem;
    }

    private boolean isActiveStudent(RoomMember member) {
        return member.isActive() && member.getRole() == Role.STUDENT;
    }

    private Feedback build(Problem problem, User student, FeedbackRequest request) {
        Feedback feedback = new Feedback();
        feedback.setProblem(problem);
        feedback.setStudent(student);
        feedback.setGrade(request.grade());
        feedback.setText(request.text().trim());
        return feedback;
    }
}