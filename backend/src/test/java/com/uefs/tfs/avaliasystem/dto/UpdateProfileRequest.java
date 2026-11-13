package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Contrato assumido (US23):
 * DTO para atualização de perfil do usuário.
 * Qualquer campo de identificação (como userId ou email) eventualmente enviado
 * no corpo deve ser sumariamente ignorado pelo Controller/Service, garantindo
 * que a identidade seja resolvida unicamente a partir do token JWT.
 */
public record UpdateProfileRequest(
        @NotBlank(message = "O nome é obrigatório")
        @Pattern(regexp = "^[^<>]*$", message = "Nome contém caracteres inválidos")
        String name
) {
}
