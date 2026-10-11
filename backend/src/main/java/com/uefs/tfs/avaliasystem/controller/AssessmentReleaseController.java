package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.service.AssessmentReleaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/problems/{problemId}")
@RequiredArgsConstructor
public class AssessmentReleaseController {
    private final AssessmentReleaseService service;

    @PatchMapping("/self-assessment-release")
    public ResponseEntity<Void> toggleSelfAssessment(@PathVariable UUID problemId, Principal principal) {
        service.toggleSelfAssessment(problemId, UUID.fromString(principal.getName()));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/peer-assessment-release")
    public ResponseEntity<Void> togglePeerAssessment(@PathVariable UUID problemId, Principal principal) {
        service.togglePeerAssessment(problemId, UUID.fromString(principal.getName()));
        return ResponseEntity.ok().build();
    }
}
