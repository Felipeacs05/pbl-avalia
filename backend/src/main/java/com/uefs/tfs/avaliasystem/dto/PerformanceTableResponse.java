package com.uefs.tfs.avaliasystem.dto;

import java.util.List;

public class PerformanceTableResponse {

    private String performanceTableId;
    private String roomId;
    private String tableName;
    private String status;
    private List<CriterionResponse> criteriaList;

    public PerformanceTableResponse() {}

    public PerformanceTableResponse(String performanceTableId, String roomId, String tableName, String status, List<CriterionResponse> criteriaList) {
        this.performanceTableId = performanceTableId;
        this.roomId = roomId;
        this.tableName = tableName;
        this.status = status;
        this.criteriaList = criteriaList;
    }

    public String getPerformanceTableId() { return performanceTableId; }
    public void setPerformanceTableId(String performanceTableId) { this.performanceTableId = performanceTableId; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getTableName() { return tableName; }
    public void setTableName(String tableName) { this.tableName = tableName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<CriterionResponse> getCriteriaList() { return criteriaList; }
    public void setCriteriaList(List<CriterionResponse> criteriaList) { this.criteriaList = criteriaList; }
}
