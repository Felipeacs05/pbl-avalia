package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Feedback;

import java.time.Instant;

/**
 * DTO de leitura do feedback (US17).
 * Intencionalmente NÃO expõe IDs internos, e-mail do tutor nem qualquer dado de credencial.
 */
public record FeedbackDTO(
        String tutorName,
        String problemTitle,
        Double grade,
        String text,
        Instant createdAt
) {
    public static FeedbackDTO from(Feedback feedback) {
        return new FeedbackDTO(
                feedback.getProblem().getRoom().getTutor().getName(),
                feedback.getProblem().getTitle(),
                feedback.getGrade(),
                feedback.getText(),
                feedback.getCreatedAt()
        );
    }
}