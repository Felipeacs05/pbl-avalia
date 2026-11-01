package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentRequest;
import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentResponse;
import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.service.SessionRoleAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class SessionRoleAssignmentController {

    private final SessionRoleAssignmentService sessionRoleAssignmentService;

    @PutMapping("/{sessionId}/roles/{role}")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionRoleAssignmentResponse assignRole(
            @PathVariable UUID sessionId,
            @PathVariable SessionRole role,
            @Valid @RequestBody SessionRoleAssignmentRequest request,
            Principal principal
    ) {
        UUID tutorId = UUID.fromString(principal.getName());
        return sessionRoleAssignmentService.assignRole(sessionId, role, request, tutorId);
    }
}
