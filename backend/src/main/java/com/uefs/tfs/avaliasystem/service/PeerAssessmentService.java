package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PeerAssessmentService {
    private final ProblemRepository problemRepository;
    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;

    @Transactional
    public void submitPeerAssessments(UUID problemId, UUID evaluatorId, List<AssessmentRequest> requests) {
        Problem p = problemRepository.findById(problemId).orElseThrow();
        if (!p.getPeerAssessmentReleased()) {
            throw new AccessDeniedException("Peer-assessment is currently closed");
        }
        
        RoomMember evaluatorMember = roomMemberRepository.findByRoomIdAndUserId(p.getRoom().getId(), evaluatorId)
            .orElseThrow(() -> new AccessDeniedException("Evaluator not in room"));
            
        if (!evaluatorMember.isActive() || evaluatorMember.getTeam() == null) {
            throw new AccessDeniedException("Evaluator is not active or has no team");
        }
        
        User evaluator = userRepository.findById(evaluatorId).orElseThrow();
        
        for (AssessmentRequest req : requests) {
            if (req.targetId().equals(evaluatorId)) {
                throw new IllegalArgumentException("Cannot peer-evaluate yourself");
            }
            
            RoomMember targetMember = roomMemberRepository.findByRoomIdAndUserId(p.getRoom().getId(), req.targetId())
                .orElseThrow(() -> new AccessDeniedException("Target not in room"));
                
            if (targetMember.getTeam() == null || !targetMember.getTeam().getId().equals(evaluatorMember.getTeam().getId())) {
                throw new AccessDeniedException("Target is not in the same team");
            }
            
            User target = userRepository.findById(req.targetId()).orElseThrow();
            
            Assessment a = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(problemId, evaluatorId, req.targetId())
                .orElse(new Assessment());
                
            a.setProblem(p);
            a.setEvaluator(evaluator);
            a.setTarget(target);
            a.setScore(req.score());
            a.setComment(req.comment());
            assessmentRepository.save(a);
        }
    }
}
