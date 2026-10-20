package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.FeedbackDTO;
import com.uefs.tfs.avaliasystem.dto.PageResponse;
import com.uefs.tfs.avaliasystem.service.FeedbackRetrievalService;
import com.uefs.tfs.avaliasystem.util.PaginationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/students/{studentId}/feedbacks")
@RequiredArgsConstructor
public class FeedbackRetrievalController {

    private final FeedbackRetrievalService service;

    @PreAuthorize("@feedbackSecurity.canView(#studentId, authentication)")
    @GetMapping
    public ResponseEntity<PageResponse<FeedbackDTO>> getStudentFeedbacks(
            @PathVariable UUID studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Principal principal) {
        return ResponseEntity.ok(service.getStudentFeedbacks(
                studentId,
                UUID.fromString(principal.getName()),
                PaginationUtils.safePageable(page, size)));
    }
}