package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssessmentRequest(
    UUID targetId,

    @NotNull(message = "Score cannot be null")
    @Min(value = 0, message = "Score must be between 0 and 10")
    @Max(value = 10, message = "Score must be between 0 and 10")
    Double score,

    @NotBlank(message = "Comment cannot be blank")
    String comment
) {}
