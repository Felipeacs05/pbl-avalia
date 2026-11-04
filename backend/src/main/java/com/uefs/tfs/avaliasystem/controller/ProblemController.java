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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ProblemController {

    private final ProblemService problemService;

    public ProblemController(ProblemService problemService) {
        this.problemService = problemService;
    }

    @PostMapping({"/rooms/{roomId}/problems", "/disciplines/{roomId}/problems"})
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

    @GetMapping({"/rooms/{roomId}/problems", "/disciplines/{roomId}/problems"})
    public ResponseEntity<List<ProblemResponse>> listProblems(@PathVariable UUID roomId) {
        List<ProblemResponse> response = problemService.listProblems(roomId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/problems/{id}")
    public ResponseEntity<ProblemResponse> getProblemById(@PathVariable UUID id) {
        return ResponseEntity.ok(problemService.getProblemById(id));
    }

    @GetMapping("/problems/{id}/evaluation-status")
    public ResponseEntity<Map<String, Object>> getEvaluationStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(problemService.getEvaluationStatusMap(id));
    }

    @PostMapping("/problems/{id}/evaluations/release")
    public ResponseEntity<Map<String, Object>> releaseEvaluation(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, Object> body,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        String type = body != null && body.get("type") != null ? String.valueOf(body.get("type")) : null;
        if ("null".equals(type)) {
            type = null;
        }
        boolean keepOthers = body != null && Boolean.TRUE.equals(body.get("keepOthers"));
        return ResponseEntity.ok(problemService.releaseEvaluation(id, type, keepOthers, userId));
    }

    @GetMapping("/sessions/{sessionId}/self-evaluations")
    public ResponseEntity<List<Map<String, Object>>> getSessionSelfEvaluations(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(problemService.getSessionSelfEvaluations(sessionId));
    }

    @GetMapping("/sessions/{sessionId}/my-summary")
    public ResponseEntity<Map<String, Object>> getStudentSessionSummary(
            @PathVariable UUID sessionId,
            @RequestParam(required = false) UUID problemId,
            Principal principal) {
        UUID studentId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(problemService.getStudentSessionSummary(sessionId, problemId, studentId));
    }

    @PostMapping("/problems/{id}/sessions")
    public ResponseEntity<Map<String, Object>> createSession(
            @PathVariable UUID id,
            Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        Map<String, Object> session = problemService.createOrGetSession(id, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @GetMapping("/problems/{id}/sessions")
    public ResponseEntity<List<Map<String, Object>>> listSessions(@PathVariable UUID id) {
        return ResponseEntity.ok(problemService.listSessions(id));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, Object>> getSessionRoster(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(problemService.getSessionRoster(sessionId));
    }

    @GetMapping("/sessions/{sessionId}/grades/status")
    public ResponseEntity<Map<String, Object>> getSessionGradesStatus(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(problemService.getSessionGradesStatus(sessionId));
    }

    @PostMapping("/sessions/{sessionId}/grades/publish")
    public ResponseEntity<Map<String, Object>> publishSessionGrades(
            @PathVariable UUID sessionId,
            @RequestBody(required = false) Map<String, List<String>> body) {
        List<String> studentIds = body != null ? body.get("studentIds") : List.of();
        return ResponseEntity.ok(problemService.publishSessionGrades(sessionId, studentIds));
    }

    @PostMapping("/sessions/{sessionId}/grades/unpublish")
    public ResponseEntity<Map<String, Object>> unpublishSessionGrades(
            @PathVariable UUID sessionId,
            @RequestBody(required = false) Map<String, List<String>> body) {
        List<String> studentIds = body != null ? body.get("studentIds") : List.of();
        return ResponseEntity.ok(problemService.unpublishSessionGrades(sessionId, studentIds));
    }
}
