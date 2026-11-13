package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Contrato assumido (US22):
 * DTO para submissão de verificação de e-mail via token.
 */
public record EmailVerificationRequest(
        @NotBlank(message = "O token de verificação é obrigatório.")
        String token
) {
}
