package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Contrato assumido (US22):
 * DTO para solicitação de reenvio de e-mail de verificação de conta.
 */
public record ResendVerificationRequest(
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Formato de e-mail inválido.")
        String email
) {
}
