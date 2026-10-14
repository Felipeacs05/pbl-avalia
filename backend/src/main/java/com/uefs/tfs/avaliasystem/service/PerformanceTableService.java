package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.CriteriaWeightsRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.CriterionWeightRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidWeightSumException;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class PerformanceTableService {

    private static final int WEIGHT_SCALE = 4;
    private static final int TOTAL_WEIGHT_UNITS = 10_000;
    private static final double TOTAL_WEIGHT = 1.0;
    private static final double WEIGHT_TOLERANCE = 1e-9;

    @Autowired
    private PerformanceTableRepository performanceTableRepository;

    @Autowired
    private CriterionRepository criterionRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Transactional
    public PerformanceTableResponse createPerformanceTable(PerformanceTableRequest request, String tutorId) {
        List<Double> resolvedWeights = resolveWeightValues(
                request.getCriteriaList().stream()
                        .map(CriterionRequest::getCriteriaWeight)
                        .toList()
        );

        Room room = roomRepository.findById(UUID.fromString(request.getRoomId()))
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada com o ID fornecido: " + request.getRoomId()));

        if (!room.getTutor().getId().toString().equals(tutorId)) {
            throw new SecurityException("Apenas o tutor responsável pela sala pode criar tabelas de desempenho.");
        }

        PerformanceTable table = getPerformanceTable(request, room, resolvedWeights);

        PerformanceTable saved = performanceTableRepository.save(table);
        return toResponse(saved);
    }

    private static PerformanceTable getPerformanceTable(PerformanceTableRequest request, Room room, List<Double> resolvedWeights) {
        PerformanceTable table = new PerformanceTable();
        table.setName(request.getTableName());
        table.setRoom(room);

        List<Criterion> criteria = new ArrayList<>();
        for (int index = 0; index < request.getCriteriaList().size(); index++) {
            CriterionRequest criterionRequest = request.getCriteriaList().get(index);
            Criterion criterion = new Criterion();
            criterion.setName(criterionRequest.getCriteriaName());
            criterion.setDescription(criterionRequest.getCriteriaDescription());
            criterion.setWeight(resolvedWeights.get(index));
            criterion.setPerformanceTable(table);
            criteria.add(criterion);
        }
        table.setCriteriaList(criteria);
        return table;
    }

    private List<Double> resolveWeightValues(List<Double> weights) {
        long nullWeights = weights.stream()
                .filter(weight -> weight == null)
                .count();

        if (nullWeights == weights.size()) {
            return distributeWeights(weights.size());
        }

        if (nullWeights > 0) {
            throw new InvalidWeightSumException("Todos os critérios devem informar peso, ou nenhum deve informar.");
        }

        double sum = weights.stream()
                .mapToDouble(Double::doubleValue)
                .sum();

        if (Math.abs(sum - TOTAL_WEIGHT) > WEIGHT_TOLERANCE) {
            throw new InvalidWeightSumException("A soma dos pesos deve ser exatamente 100% (1.0).");
        }

        return weights;
    }

    private List<Double> distributeWeights(int criteriaCount) {
        int baseUnits = TOTAL_WEIGHT_UNITS / criteriaCount;
        int remainderUnits = TOTAL_WEIGHT_UNITS % criteriaCount;
        List<Double> weights = new ArrayList<>(criteriaCount);

        for (int index = 0; index < criteriaCount; index++) {
            int units = baseUnits + (index < remainderUnits ? 1 : 0);
            weights.add(units / Math.pow(10, WEIGHT_SCALE));
        }

        return weights;
    }

    @Transactional
    public PerformanceTableResponse updateCriteriaWeights(
            UUID performanceTableId,
            CriteriaWeightsRequest request,
            String tutorId
    ) {
        PerformanceTable table = performanceTableRepository.findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException("Tabela de desempenho não encontrada: " + performanceTableId));

        validateTutorPermission(table, tutorId);

        List<CriterionWeightRequest> requestedWeights = request.getWeights();
        Set<UUID> requestedIds = validateCriteriaIds(table.getCriteriaList(), requestedWeights);

        List<Double> resolvedWeights = resolveWeightValues(
                requestedWeights.stream()
                        .map(CriterionWeightRequest::getCriteriaWeight)
                        .toList()
        );

        Map<UUID, Double> weightsByCriterionId = new HashMap<>();
        for (int index = 0; index < requestedWeights.size(); index++) {
            weightsByCriterionId.put(requestedWeights.get(index).getCriterionId(), resolvedWeights.get(index));
        }

        table.getCriteriaList().removeIf(criterion -> !requestedIds.contains(criterion.getId()));
        table.getCriteriaList().forEach(criterion -> criterion.setWeight(weightsByCriterionId.get(criterion.getId())));

        return toResponse(performanceTableRepository.save(table));
    }

    @Transactional(readOnly = true)
    public PerformanceTableResponse getPerformanceTable(UUID performanceTableId) {
        PerformanceTable table = performanceTableRepository.findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException("Tabela de desempenho não encontrada: " + performanceTableId));
        return toResponse(table);
    }

    private Set<UUID> validateCriteriaIds(List<Criterion> criteria, List<CriterionWeightRequest> requestedWeights) {
        Set<UUID> requestedIds = new HashSet<>();
        for (CriterionWeightRequest requestedWeight : requestedWeights) {
            if (!requestedIds.add(requestedWeight.getCriterionId())) {
                throw new InvalidWeightSumException("Cada critério deve ser informado exatamente uma vez.");
            }
        }

        Set<UUID> criterionIds = criteria.stream()
                .map(Criterion::getId)
                .collect(java.util.stream.Collectors.toSet());

        if (!criterionIds.containsAll(requestedIds)) {
            throw new InvalidWeightSumException("A requisição contém um critério que não pertence à tabela.");
        }

        return requestedIds;
    }

    private void validateTutorPermission(PerformanceTable table, String tutorId) {
        Room ownerRoom = table.getRoom() != null ? table.getRoom() : table.getProblem().getRoom();
        if (!ownerRoom.getTutor().getId().toString().equals(tutorId)) {
            throw new SecurityException("Apenas o tutor responsável pela sala pode gerenciar critérios.");
        }
    }

    private PerformanceTableResponse toResponse(PerformanceTable table) {
        List<CriterionResponse> criteriaResponses = table.getCriteriaList().stream()
                .map(c -> new CriterionResponse(c.getId(), c.getName(), c.getDescription(), c.getWeight(), "ACTIVE"))
                .toList();

        Room ownerRoom = table.getRoom() != null ? table.getRoom() : table.getProblem().getRoom();

        return new PerformanceTableResponse(
                table.getId(),
                ownerRoom.getId(),
                table.getName(),
                "ACTIVE",
                criteriaResponses
        );
    }

    @Transactional(readOnly = true)
    public double calculateFinalGrade(UUID performanceTableId, Map<UUID, Double> gradesByCriterion) {
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(performanceTableId);

        return criteria.stream()
                .mapToDouble(criterion -> {
                    Double grade = gradesByCriterion.get(criterion.getId());
                    if (grade == null) {
                        throw new IllegalArgumentException("Nota não informada para o critério: " + criterion.getId());
                    }
                    return grade * criterion.getWeight();
                })
                .sum();
    }
}
