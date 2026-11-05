package com.uefs.tfs.avaliasystem.dto;

import java.util.List;
import java.util.UUID;

public record EvaluationStatusResponse(
        UUID problemId,
        String activeType,
        List<String> activeTypes,
        boolean isReleased,
        Boolean selfAssessmentReleased,
        Boolean peerAssessmentReleased
) {}

