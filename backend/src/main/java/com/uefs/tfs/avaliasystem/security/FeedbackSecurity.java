package com.uefs.tfs.avaliasystem.security;

import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Regra de isolamento da US17: só o próprio aluno ou o tutor emissor leem os feedbacks.
 */
@Component("feedbackSecurity")
@RequiredArgsConstructor
public class FeedbackSecurity {

    private final FeedbackRepository feedbackRepository;

    public boolean canView(UUID studentId, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return userId.equals(studentId)
                || feedbackRepository.existsByStudentIdAndProblemRoomTutorId(studentId, userId);
    }
}