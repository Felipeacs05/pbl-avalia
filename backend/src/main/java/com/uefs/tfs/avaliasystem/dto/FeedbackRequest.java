package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record FeedbackRequest(
        @NotNull(message = "O aluno é obrigatório")
        UUID studentId,

        @NotNull(message = "A nota é obrigatória")
        @Min(value = 0, message = "A nota deve estar entre 0 e 10")
        @Max(value = 10, message = "A nota deve estar entre 0 e 10")
        Double grade,

        @NotBlank(message = "O texto do feedback não pode ser vazio")
        String text
) {}