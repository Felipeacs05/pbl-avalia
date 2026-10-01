package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.dto.ProblemResponse;
import com.uefs.tfs.avaliasystem.service.ProblemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ProblemController {

    private final ProblemService problemService;

    public ProblemController(ProblemService problemService) {
        this.problemService = problemService;
    }

    @PostMapping("/rooms/{roomId}/problems")
    public ResponseEntity<ProblemResponse> createProblem(
            @PathVariable UUID roomId,
            @Valid @RequestBody ProblemRequest request,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        ProblemResponse response = problemService.createProblem(roomId, request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/problems/{id}")
    public ResponseEntity<ProblemResponse> updateProblem(
            @PathVariable UUID id,
            @Valid @RequestBody ProblemRequest request,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        ProblemResponse response = problemService.updateProblem(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/problems/{id}")
    public ResponseEntity<Void> deleteProblem(
            @PathVariable UUID id,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        problemService.deleteProblem(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/rooms/{roomId}/problems")
    public ResponseEntity<List<ProblemResponse>> listProblems(@PathVariable UUID roomId) {
        List<ProblemResponse> response = problemService.listProblems(roomId);
        return ResponseEntity.ok(response);
    }
}