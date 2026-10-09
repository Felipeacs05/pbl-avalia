package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.service.SelfAssessmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/problems/{problemId}/self-assessment")
@RequiredArgsConstructor
public class SelfAssessmentController {
    private final SelfAssessmentService service;

    @PostMapping
    public ResponseEntity<Void> submitSelfAssessment(@PathVariable UUID problemId, @Valid @RequestBody AssessmentRequest request, Principal principal) {
        service.submitSelfAssessment(problemId, UUID.fromString(principal.getName()), request);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
