package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class CriteriaWeightsRequest {

    @NotEmpty(message = "A lista de pesos não pode estar vazia")
    @Valid
    private List<CriterionWeightRequest> weights;

    public CriteriaWeightsRequest() {}

    public CriteriaWeightsRequest(List<CriterionWeightRequest> weights) {
        this.weights = weights;
    }

    public List<CriterionWeightRequest> getWeights() { return weights; }
    public void setWeights(List<CriterionWeightRequest> weights) { this.weights = weights; }
}
