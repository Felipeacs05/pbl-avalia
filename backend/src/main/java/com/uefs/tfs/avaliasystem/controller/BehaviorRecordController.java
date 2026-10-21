package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.BehaviorRecordRequest;
import com.uefs.tfs.avaliasystem.dto.BehaviorRecordResponse;
import com.uefs.tfs.avaliasystem.dto.BehaviorTagResponse;
import com.uefs.tfs.avaliasystem.service.BehaviorRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Comportamentos", description = "Registros de comportamento dos alunos durante as sessões")
public class BehaviorRecordController {

    private final BehaviorRecordService behaviorRecordService;

    @GetMapping("/rooms/{roomId}/behavior-tags")
    @Operation(summary = "Listar tags de comportamento da sala")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Tags listadas com sucesso"),
            @ApiResponse(responseCode = "401", description = "Usuário não autenticado")
    })
    public ResponseEntity<List<BehaviorTagResponse>> listBehaviorTags(@PathVariable UUID roomId) {
        return ResponseEntity.ok(behaviorRecordService.listBehaviorTags(roomId));
    }

    @PostMapping("/sessions/{sessionId}/students/{studentId}/behavior-records")
    @Operation(summary = "Registrar comportamento de um aluno na sessão")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Comportamento registrado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Usuário não é o tutor responsável"),
            @ApiResponse(responseCode = "404", description = "Sessão, aluno ou tag não encontrada")
    })
    public ResponseEntity<BehaviorRecordResponse> createBehaviorRecord(
            @PathVariable UUID sessionId,
            @PathVariable UUID studentId,
            @Valid @RequestBody BehaviorRecordRequest request,
            Principal principal
    ) {
        UUID requesterId = UUID.fromString(principal.getName());
        BehaviorRecordResponse response = behaviorRecordService.createBehaviorRecord(
                sessionId,
                studentId,
                request,
                requesterId
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
