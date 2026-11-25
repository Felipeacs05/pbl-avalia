package com.uefs.tfs.avaliasystem.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdateProfileRequest(
        @NotBlank(message = "O nome é obrigatório.")
        String name
) {
    public String getName() {
        return name;
    }
}
