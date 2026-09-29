package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JoinRoomRequest {
    @NotBlank(message = "Código de acesso é necessário")
    private String accessCode;
}
