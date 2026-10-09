package com.uefs.tfs.avaliasystem.dto;

import java.util.UUID;

public class CriterionResponse {

    private UUID criterionId;
    private String criteriaName;
    private String criteriaDescription;
    private Double criteriaWeight;
    private String status;

    public CriterionResponse() {}

    public CriterionResponse(UUID criterionId, String criteriaName, String criteriaDescription, Double criteriaWeight, String status) {
        this.criterionId = criterionId;
        this.criteriaName = criteriaName;
        this.criteriaDescription = criteriaDescription;
        this.criteriaWeight = criteriaWeight;
        this.status = status;
    }

    public UUID getCriterionId() { return criterionId; }
    public void setCriterionId(UUID criterionId) { this.criterionId = criterionId; }

    public String getCriteriaName() { return criteriaName; }
    public void setCriteriaName(String criteriaName) { this.criteriaName = criteriaName; }

    public String getCriteriaDescription() { return criteriaDescription; }
    public void setCriteriaDescription(String criteriaDescription) { this.criteriaDescription = criteriaDescription; }

    public Double getCriteriaWeight() { return criteriaWeight; }
    public void setCriteriaWeight(Double criteriaWeight) { this.criteriaWeight = criteriaWeight; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
