package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentRequest;
import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentResponse;
import com.uefs.tfs.avaliasystem.service.GradeAdjustmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assessments/{assessmentId}/grade-adjustment")
@RequiredArgsConstructor
public class GradeAdjustmentController {

    private final GradeAdjustmentService service;

    @PatchMapping
    public ResponseEntity<GradeAdjustmentResponse> adjustGrade(
            @PathVariable UUID assessmentId,
            @Valid @RequestBody GradeAdjustmentRequest request,
            Principal principal) {
        return ResponseEntity.ok(
                service.adjustGrade(assessmentId, UUID.fromString(principal.getName()), request));
    }
}