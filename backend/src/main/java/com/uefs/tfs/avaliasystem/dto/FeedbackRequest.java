package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record FeedbackRequest(
        @NotNull(message = "O aluno é obrigatório")
        UUID studentId,

        @NotNull(message = "A nota é obrigatória")
        @DecimalMin(value = "0.0", message = "A nota deve estar entre 0 e 10")
        @DecimalMax(value = "10.0", message = "A nota deve estar entre 0 e 10")
        Double grade,

        @NotBlank(message = "O texto do feedback não pode ser vazio")
        String text
) {}