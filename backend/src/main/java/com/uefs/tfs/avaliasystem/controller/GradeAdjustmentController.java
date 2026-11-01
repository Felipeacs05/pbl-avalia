package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentRequest;
import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentResponse;
import com.uefs.tfs.avaliasystem.service.GradeAdjustmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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

    @Operation(
        summary = "Ajusta a nota de uma avaliação",
        description = "Permite que o tutor da sala altere a nota de uma avaliação enviada por um aluno. A justificativa é obrigatória. A nota original é sempre preservada para auditoria."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Nota ajustada com sucesso"),
        @ApiResponse(responseCode = "400", description = "Payload inválido: nota fora de 0 a 10 ou justificativa ausente"),
        @ApiResponse(responseCode = "401", description = "Requisição sem autenticação"),
        @ApiResponse(responseCode = "403", description = "Acesso negado: apenas o tutor da sala pode ajustar notas"),
        @ApiResponse(responseCode = "404", description = "Avaliação não encontrada")
    })
    @PatchMapping
    public ResponseEntity<GradeAdjustmentResponse> adjustGrade(
            @PathVariable UUID assessmentId,
            @Valid @RequestBody GradeAdjustmentRequest request,
            Principal principal) {
        return ResponseEntity.ok(
                service.adjustGrade(assessmentId, UUID.fromString(principal.getName()), request));
    }
}
