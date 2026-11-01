package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SessionRoleAssignmentRequest {

    @NotNull(message = "O ID do aluno é obrigatório")
    private UUID studentId;

    @NotNull(message = "A nota extra é obrigatória")
    @DecimalMin(value = "0.0", message = "A nota extra não pode ser menor que 0.0")
    @DecimalMax(value = "10.0", message = "A nota extra não pode ser maior que 10.0")
    private Double extraGrade;
}
