package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.FeedbackBatchDTO;
import com.uefs.tfs.avaliasystem.dto.FeedbackRequest;
import com.uefs.tfs.avaliasystem.dto.FeedbackResponse;
import com.uefs.tfs.avaliasystem.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/problems/{problemId}/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService service;

    @PostMapping
    public ResponseEntity<FeedbackResponse> sendFeedback(
            @PathVariable UUID problemId,
            @Valid @RequestBody FeedbackRequest request,
            Principal principal) {
        FeedbackResponse response = service.sendFeedback(problemId, UUID.fromString(principal.getName()), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<FeedbackResponse>> sendBatchFeedback(
            @PathVariable UUID problemId,
            @Valid @RequestBody FeedbackBatchDTO batch,
            Principal principal) {
        List<FeedbackResponse> response = service.sendBatchFeedback(problemId, UUID.fromString(principal.getName()), batch);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}