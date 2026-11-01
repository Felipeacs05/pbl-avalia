package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssessmentReleaseService {
    private final ProblemRepository problemRepository;

    @Transactional
    public Problem toggleSelfAssessment(UUID problemId, UUID tutorId) {
        Problem p = problemRepository.findById(problemId).orElseThrow();
        if (!p.getRoom().getTutor().getId().equals(tutorId)) {
            throw new AccessDeniedException("Only the tutor can toggle self-assessment");
        }
        boolean isCurrentlyReleased = Boolean.TRUE.equals(p.getSelfAssessmentReleased());
        p.setSelfAssessmentReleased(!isCurrentlyReleased);
        return problemRepository.save(p);
    }

    @Transactional
    public Problem togglePeerAssessment(UUID problemId, UUID tutorId) {
        Problem p = problemRepository.findById(problemId).orElseThrow();
        if (!p.getRoom().getTutor().getId().equals(tutorId)) {
            throw new AccessDeniedException("Only the tutor can toggle peer-assessment");
        }
        boolean isCurrentlyReleased = Boolean.TRUE.equals(p.getPeerAssessmentReleased());
        p.setPeerAssessmentReleased(!isCurrentlyReleased);
        return problemRepository.save(p);
    }
}
