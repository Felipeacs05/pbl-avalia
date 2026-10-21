package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Assessment;

import java.util.UUID;

public record GradeAdjustmentResponse(
        UUID assessmentId,
        Double originalGrade,
        Double adjustedGrade,
        String justification,
        Boolean modifiedByTutor
) {
    public static GradeAdjustmentResponse from(Assessment assessment) {
        return new GradeAdjustmentResponse(
                assessment.getId(),
                assessment.getOriginalGrade(),
                assessment.getAdjustedGrade(),
                assessment.getJustification(),
                assessment.getModifiedByTutor()
        );
    }
}
