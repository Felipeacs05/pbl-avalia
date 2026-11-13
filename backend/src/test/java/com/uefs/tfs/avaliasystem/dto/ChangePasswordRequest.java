package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Contrato assumido (US23):
 * DTO para solicitação de alteração de senha de usuário autenticado.
 */
public record ChangePasswordRequest(
        @NotBlank(message = "A senha atual é obrigatória")
        String currentPassword,

        @NotBlank(message = "A nova senha é obrigatória")
        String newPassword
) {
}
