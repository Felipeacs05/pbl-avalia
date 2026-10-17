package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.UUID;

public class CriterionWeightRequest {

    @NotNull(message = "O ID do critério é obrigatório")
    private UUID criterionId;

    @PositiveOrZero(message = "O peso do critério deve ser positivo")
    private Double criteriaWeight;

    public CriterionWeightRequest() {}

    public CriterionWeightRequest(UUID criterionId, Double criteriaWeight) {
        this.criterionId = criterionId;
        this.criteriaWeight = criteriaWeight;
    }

    public UUID getCriterionId() { return criterionId; }
    public void setCriterionId(UUID criterionId) { this.criterionId = criterionId; }

    public Double getCriteriaWeight() { return criteriaWeight; }
    public void setCriteriaWeight(Double criteriaWeight) { this.criteriaWeight = criteriaWeight; }
}
