
package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.CriteriaWeightsRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
import com.uefs.tfs.avaliasystem.service.PerformanceTableService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/performance-tables")
@Tag(
        name = "Tabelas de desempenho",
        description = "Gerenciamento das tabelas e dos pesos dos critérios"
)
public class PerformanceTableController {

    @Autowired
    private PerformanceTableService performanceTableService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Criar tabela de desempenho",
            description = "Cria uma tabela com seus critérios e distribui os pesos igualmente quando nenhum peso é informado."
    )
    public PerformanceTableResponse createPerformanceTable(
            @RequestBody @Valid PerformanceTableRequest request,
            Principal principal
    ) {
        return performanceTableService.createPerformanceTable(
                request,
                UUID.fromString(principal.getName())
        );
    }

    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    @Operation(
            summary = "Consultar tabela de desempenho",
            description = "Retorna a tabela de desempenho e seus critérios."
    )
    public PerformanceTableResponse getPerformanceTable(
            @PathVariable UUID id
    ) {
        return performanceTableService.getPerformanceTable(id);
    }

    @PutMapping("/{performanceTableId}/criteria/weights")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize(
            "@performanceTableSecurity.isOwner(#performanceTableId, authentication)"
    )
    @Operation(
            summary = "Atualizar pesos dos critérios",
            description = "Substitui os pesos da tabela e remove os critérios omitidos. A soma final deve ser igual a 100% (1.0)."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Pesos atualizados"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "Usuário não é o tutor responsável"
            ),
            @ApiResponse(
                    responseCode = "422",
                    description = "Distribuição de pesos inválida"
            )
    })
    public PerformanceTableResponse updateCriteriaWeights(
            @PathVariable UUID performanceTableId,
            @RequestBody @Valid CriteriaWeightsRequest request,
            Principal principal
    ) {
        return performanceTableService.updateCriteriaWeights(
                performanceTableId,
                request,
                UUID.fromString(principal.getName())
        );
    }

    @PostMapping("/{performanceTableId}/criteria")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Adicionar critério",
            description = "Adiciona um novo critério à tabela de desempenho."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "201",
                    description = "Critério adicionado"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "Usuário não é o tutor responsável"
            )
    })
    public CriterionResponse addCriterion(
            @PathVariable UUID performanceTableId,
            @RequestBody @Valid CriterionRequest request,
            Principal principal
    ) {
        return performanceTableService.addCriterion(
                performanceTableId,
                request,
                UUID.fromString(principal.getName())
        );
    }

    @DeleteMapping("/{performanceTableId}/criteria/{criterionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Remover critério",
            description = "Remove um critério da tabela de desempenho."
    )
    @ApiResponses({
            @ApiResponse(
                    responseCode = "204",
                    description = "Critério removido"
            ),
            @ApiResponse(
                    responseCode = "403",
                    description = "Usuário não é o tutor responsável"
            )
    })
    public void deleteCriterion(
            @PathVariable UUID performanceTableId,
            @PathVariable UUID criterionId,
            Principal principal
    ) {
        performanceTableService.deleteCriterion(
                performanceTableId,
                criterionId,
                UUID.fromString(principal.getName())
        );
    }
}
