package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.SessionRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SessionRoleAssignmentResponse {
    private UUID id;
    private UUID sessionId;
    private UUID studentId;
    private String studentName;
    private SessionRole role;
    private Double extraGrade;
}
