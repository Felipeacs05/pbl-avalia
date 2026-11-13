package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.EvaluationReleaseRequest;
import com.uefs.tfs.avaliasystem.dto.EvaluationStatusResponse;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssessmentReleaseService {
    private final ProblemRepository problemRepository;

    @Transactional(readOnly = true)
    public EvaluationStatusResponse getEvaluationStatus(UUID problemId) {
        Problem p = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        boolean selfReleased = Boolean.TRUE.equals(p.getSelfAssessmentReleased());
        boolean peerReleased = Boolean.TRUE.equals(p.getPeerAssessmentReleased());

        List<String> activeTypes = new ArrayList<>();
        if (selfReleased) activeTypes.add("self_evaluation");
        if (peerReleased) activeTypes.add("peer_evaluation");

        String activeType = activeTypes.isEmpty() ? null : activeTypes.get(0);
        boolean isReleased = !activeTypes.isEmpty();

        return new EvaluationStatusResponse(
                p.getId(),
                activeType,
                activeTypes,
                isReleased,
                selfReleased,
                peerReleased
        );
    }

    @Transactional
    public EvaluationStatusResponse releaseEvaluation(UUID problemId, UUID tutorId, EvaluationReleaseRequest request) {
        Problem p = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        if (!p.getRoom().getTutor().getId().equals(tutorId)) {
            throw new AccessDeniedException("Only the tutor can change assessment release");
        }

        String type = request.getType();
        boolean keepOthers = Boolean.TRUE.equals(request.getKeepOthers());

        if (type == null) {
            if (!keepOthers) {
                p.setSelfAssessmentReleased(false);
                p.setPeerAssessmentReleased(false);
            }
        } else if ("self_evaluation".equalsIgnoreCase(type) || "SELF".equalsIgnoreCase(type)) {
            p.setSelfAssessmentReleased(true);
            if (!keepOthers) {
                p.setPeerAssessmentReleased(false);
            }
        } else if ("peer_evaluation".equalsIgnoreCase(type) || "PEER".equalsIgnoreCase(type)) {
            p.setPeerAssessmentReleased(true);
            if (!keepOthers) {
                p.setSelfAssessmentReleased(false);
            }
        }

        problemRepository.save(p);
        return getEvaluationStatus(problemId);
    }

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
