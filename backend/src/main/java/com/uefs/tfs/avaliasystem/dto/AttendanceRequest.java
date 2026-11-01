package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.AttendanceStatus;

public class AttendanceRequest {

    private AttendanceStatus status;


    public AttendanceRequest() {
    }


    public AttendanceRequest(AttendanceStatus status) {
        this.status = status;
    }

    public AttendanceStatus getStatus() {
        return status;
    }

    public void setStatus(AttendanceStatus status) {
        this.status = status;
    }
}