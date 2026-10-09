package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class GroupMemberRequest {

    @NotNull(message = "O identificador do aluno é obrigatório")
    private UUID studentId;

    public GroupMemberRequest() {}

    public GroupMemberRequest(UUID studentId) {
        this.studentId = studentId;
    }

    public UUID getStudentId() {
        return studentId;
    }

    public void setStudentId(UUID studentId) {
        this.studentId = studentId;
    }
}
