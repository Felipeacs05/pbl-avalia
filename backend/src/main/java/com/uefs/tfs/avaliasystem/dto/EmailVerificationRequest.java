package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;

public record EmailVerificationRequest(
        @NotBlank(message = "O token é obrigatório.")
        String token
) {
}
