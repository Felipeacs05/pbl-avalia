package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public class CriterionRequest {

    @NotBlank(message = "O nome do critério é obrigatório")
    @Pattern(regexp = "^[a-zA-Z0-9À-ÿ\\s-]+$", message = "O nome do critério contém caracteres inválidos. Utilize apenas letras, números e hifens.")
    @Size(min = 1, max = 255, message = "O nome do critério deve ter entre 1 e 255 caracteres")
    private String criteriaName;

    private String criteriaDescription;

    @PositiveOrZero(message = "O peso do critério deve ser positivo")
    private Double criteriaWeight = 1.0;

    public CriterionRequest() {}

    public CriterionRequest(String criteriaName, String criteriaDescription, Double criteriaWeight) {
        this.criteriaName = criteriaName;
        this.criteriaDescription = criteriaDescription;
        this.criteriaWeight = criteriaWeight;
    }

    public String getCriteriaName() { return criteriaName; }
    public void setCriteriaName(String criteriaName) { this.criteriaName = criteriaName; }

    public String getCriteriaDescription() { return criteriaDescription; }
    public void setCriteriaDescription(String criteriaDescription) { this.criteriaDescription = criteriaDescription; }

    public Double getCriteriaWeight() { return criteriaWeight; }
    public void setCriteriaWeight(Double criteriaWeight) { this.criteriaWeight = criteriaWeight; }
}
