package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
import com.uefs.tfs.avaliasystem.service.PerformanceTableService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/performance-tables")
public class PerformanceTableController {

    @Autowired
    private PerformanceTableService performanceTableService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PerformanceTableResponse createPerformanceTable(
            @RequestBody @Valid PerformanceTableRequest request,
            Principal principal
    ) {
        return performanceTableService.createPerformanceTable(request, principal.getName());
    }

    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public PerformanceTableResponse getPerformanceTable(@PathVariable String id) {
        return performanceTableService.getPerformanceTable(id);
    }

    @PostMapping("/{performanceTableId}/criteria")
    @ResponseStatus(HttpStatus.CREATED)
    public CriterionResponse addCriterion(
            @PathVariable String performanceTableId,
            @RequestBody @Valid CriterionRequest request,
            Principal principal
    ) {
        return performanceTableService.addCriterion(performanceTableId, request, principal.getName());
    }

    @DeleteMapping("/{performanceTableId}/criteria/{criterionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCriterion(
            @PathVariable String performanceTableId,
            @PathVariable String criterionId,
            Principal principal
    ) {
        performanceTableService.deleteCriterion(performanceTableId, criterionId, principal.getName());
    }
}
