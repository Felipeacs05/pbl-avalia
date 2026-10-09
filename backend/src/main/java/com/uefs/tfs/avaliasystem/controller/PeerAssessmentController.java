package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.service.PeerAssessmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/problems/{problemId}/peer-assessments")
@RequiredArgsConstructor
public class PeerAssessmentController {
    private final PeerAssessmentService service;

    @PostMapping
    public ResponseEntity<Void> submitPeerAssessments(@PathVariable UUID problemId, @Valid @RequestBody List<AssessmentRequest> requests, Principal principal) {
        service.submitPeerAssessments(problemId, UUID.fromString(principal.getName()), requests);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
