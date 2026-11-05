package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.EvaluationReleaseRequest;
import com.uefs.tfs.avaliasystem.dto.EvaluationStatusResponse;
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

    @GetMapping("/evaluation-status")
    public ResponseEntity<EvaluationStatusResponse> getEvaluationStatus(@PathVariable UUID problemId) {
        return ResponseEntity.ok(service.getEvaluationStatus(problemId));
    }

    @PostMapping("/evaluations/release")
    public ResponseEntity<EvaluationStatusResponse> releaseEvaluation(
            @PathVariable UUID problemId,
            @RequestBody EvaluationReleaseRequest request,
            Principal principal
    ) {
        return ResponseEntity.ok(service.releaseEvaluation(problemId, UUID.fromString(principal.getName()), request));
    }

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
