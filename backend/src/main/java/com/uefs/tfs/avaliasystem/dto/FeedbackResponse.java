package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Feedback;

import java.util.UUID;

public record FeedbackResponse(
        UUID id,
        UUID problemId,
        UUID studentId,
        Double grade,
        String text
) {
    public static FeedbackResponse from(Feedback f) {
        return new FeedbackResponse(
                f.getId(), f.getProblem().getId(), f.getStudent().getId(), f.getGrade(), f.getText());
    }
}