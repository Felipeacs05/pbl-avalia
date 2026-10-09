package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public class PerformanceTableRequest {

    @NotNull(message = "O ID da sala é obrigatório")
    private UUID roomId;

    @NotBlank(message = "O nome da tabela de desempenho é obrigatório")
    @Size(min = 3, max = 255, message = "O nome da tabela deve ter entre 3 e 255 caracteres")
    private String tableName;

    @NotEmpty(message = "A lista de critérios não pode estar vazia")
    @Valid
    private List<CriterionRequest> criteriaList;

    public PerformanceTableRequest() {}

    public PerformanceTableRequest(UUID roomId, String tableName, List<CriterionRequest> criteriaList) {
        this.roomId = roomId;
        this.tableName = tableName;
        this.criteriaList = criteriaList;
    }

    public UUID getRoomId() { return roomId; }
    public void setRoomId(UUID roomId) { this.roomId = roomId; }

    public String getTableName() { return tableName; }
    public void setTableName(String tableName) { this.tableName = tableName; }

    public List<CriterionRequest> getCriteriaList() { return criteriaList; }
    public void setCriteriaList(List<CriterionRequest> criteriaList) { this.criteriaList = criteriaList; }
}
