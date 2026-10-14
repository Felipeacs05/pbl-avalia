package com.uefs.tfs.avaliasystem.dto;

import java.util.List;
import java.util.UUID;

public class PerformanceTableResponse {

    private UUID performanceTableId;
    private UUID roomId;
    private String tableName;
    private String status;
    private List<CriterionResponse> criteriaList;

    public PerformanceTableResponse() {}

    public PerformanceTableResponse(UUID performanceTableId, UUID roomId, String tableName, String status, List<CriterionResponse> criteriaList) {
        this.performanceTableId = performanceTableId;
        this.roomId = roomId;
        this.tableName = tableName;
        this.status = status;
        this.criteriaList = criteriaList;
    }

    public UUID getPerformanceTableId() { return performanceTableId; }
    public void setPerformanceTableId(UUID performanceTableId) { this.performanceTableId = performanceTableId; }

    public UUID getRoomId() { return roomId; }
    public void setRoomId(UUID roomId) { this.roomId = roomId; }

    public String getTableName() { return tableName; }
    public void setTableName(String tableName) { this.tableName = tableName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<CriterionResponse> getCriteriaList() { return criteriaList; }
    public void setCriteriaList(List<CriterionResponse> criteriaList) { this.criteriaList = criteriaList; }
}
