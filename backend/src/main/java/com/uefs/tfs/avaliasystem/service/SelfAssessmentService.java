package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SelfAssessmentService {
    private final ProblemRepository problemRepository;
    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;

    @Transactional
    public void submitSelfAssessment(UUID problemId, UUID studentId, AssessmentRequest request) {
        Problem p = problemRepository.findById(problemId).orElseThrow();
        if (!p.getSelfAssessmentReleased()) {
            throw new AccessDeniedException("Self-assessment is currently closed");
        }
        User student = userRepository.findById(studentId).orElseThrow();
        
        Assessment a = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(problemId, studentId, studentId)
            .orElse(new Assessment());
            
        a.setProblem(p);
        a.setEvaluator(student);
        a.setTarget(student);
        a.setScore(request.score());
        a.setComment(request.comment());
        assessmentRepository.save(a);
    }
}
