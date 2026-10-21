package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.AttendanceStatus;

import java.time.Instant;
import java.util.UUID;

public class AttendanceResponse {

    private UUID id;
    private UUID sessionId;
    private UUID studentId;
    private String studentName;
    private AttendanceStatus status;
    private Instant recordedAt;


    public AttendanceResponse() {
    }


    public AttendanceResponse(UUID id, UUID sessionId, UUID studentId, String studentName, AttendanceStatus status, Instant recordedAt) {
        this.id = id;
        this.sessionId = sessionId;
        this.studentId = studentId;
        this.studentName = studentName;
        this.status = status;
        this.recordedAt = recordedAt;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public void setSessionId(UUID sessionId) {
        this.sessionId = sessionId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public void setStudentId(UUID studentId) {
        this.studentId = studentId;
    }

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public void setStatus(AttendanceStatus status) {
        this.status = status;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }
}