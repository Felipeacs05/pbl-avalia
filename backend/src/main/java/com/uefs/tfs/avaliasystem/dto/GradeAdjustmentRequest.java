package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GradeAdjustmentRequest(
        @NotNull(message = "A nota ajustada é obrigatória")
        @Min(value = 0, message = "A nota ajustada deve estar entre 0 e 10")
        @Max(value = 10, message = "A nota ajustada deve estar entre 0 e 10")
        Double adjustedGrade,

        @NotBlank(message = "Justificativa é obrigatória")
        String justification
) {}