
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

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PerformanceTableService {

    private static final int WEIGHT_SCALE = 4;
    private static final int TOTAL_WEIGHT_UNITS = 10_000;
    private static final double TOTAL_WEIGHT = 1.0;
    private static final double WEIGHT_TOLERANCE = 1e-9;

    private final PerformanceTableRepository performanceTableRepository;
    private final CriterionRepository criterionRepository;
    private final RoomRepository roomRepository;

    public PerformanceTableService(
            PerformanceTableRepository performanceTableRepository,
            CriterionRepository criterionRepository,
            RoomRepository roomRepository
    ) {
        this.performanceTableRepository = performanceTableRepository;
        this.criterionRepository = criterionRepository;
        this.roomRepository = roomRepository;
    }

    @Transactional
    public PerformanceTableResponse createPerformanceTable(
            PerformanceTableRequest request,
            UUID tutorId
    ) {
        if (request.getCriteriaList() == null
                || request.getCriteriaList().isEmpty()) {
            throw new InvalidWeightSumException(
                    "A tabela deve possuir pelo menos um critério."
            );
        }

        List<Double> resolvedWeights = resolveWeightValues(
                request.getCriteriaList().stream()
                        .map(CriterionRequest::getCriteriaWeight)
                        .toList()
        );

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Sala não encontrada com o ID fornecido: "
                                + request.getRoomId()
                ));

        if (!room.getTutor().getId().equals(tutorId)) {
            throw new SecurityException(
                    "Apenas o tutor responsável pela sala pode criar tabelas de desempenho."
            );
        }

        PerformanceTable table = getPerformanceTable(
                request,
                room,
                resolvedWeights
        );

        PerformanceTable saved = performanceTableRepository.save(table);

        return toResponse(saved);
    }

    private static PerformanceTable getPerformanceTable(
            PerformanceTableRequest request,
            Room room,
            List<Double> resolvedWeights
    ) {
        PerformanceTable table = new PerformanceTable();

        table.setName(request.getTableName());
        table.setRoom(room);

        List<Criterion> criteria = new ArrayList<>();

        for (int index = 0; index < request.getCriteriaList().size(); index++) {
            CriterionRequest criterionRequest =
                    request.getCriteriaList().get(index);

            Criterion criterion = new Criterion();

            criterion.setName(criterionRequest.getCriteriaName());
            criterion.setDescription(
                    criterionRequest.getCriteriaDescription()
            );
            criterion.setWeight(resolvedWeights.get(index));
            criterion.setPerformanceTable(table);

            criteria.add(criterion);
        }

        table.setCriteriaList(criteria);

        return table;
    }

    private List<Double> resolveWeightValues(List<Double> weights) {
        if (weights == null || weights.isEmpty()) {
            throw new InvalidWeightSumException(
                    "É necessário informar pelo menos um critério."
            );
        }

        long nullWeights = weights.stream()
                .filter(weight -> weight == null)
                .count();

        if (nullWeights == weights.size()) {
            return distributeWeights(weights.size());
        }

        if (nullWeights > 0) {
            throw new InvalidWeightSumException(
                    "Todos os critérios devem informar peso, ou nenhum deve informar."
            );
        }

        for (Double weight : weights) {
            if (!Double.isFinite(weight) || weight < 0) {
                throw new InvalidWeightSumException(
                        "Os pesos devem ser números finitos e não negativos."
                );
            }
        }

        double sum = weights.stream()
                .mapToDouble(Double::doubleValue)
                .sum();

        if (Math.abs(sum - TOTAL_WEIGHT) > WEIGHT_TOLERANCE) {
            throw new InvalidWeightSumException(
                    "A soma dos pesos deve ser exatamente 100% (1.0)."
            );
        }

        return weights;
    }

    private List<Double> distributeWeights(int criteriaCount) {
        if (criteriaCount <= 0) {
            throw new InvalidWeightSumException(
                    "É necessário possuir pelo menos um critério."
            );
        }

        if (criteriaCount > TOTAL_WEIGHT_UNITS) {
            throw new InvalidWeightSumException(
                    "Quantidade de critérios superior à precisão suportada."
            );
        }

        int baseUnits = TOTAL_WEIGHT_UNITS / criteriaCount;
        int remainderUnits = TOTAL_WEIGHT_UNITS % criteriaCount;

        List<Double> weights = new ArrayList<>(criteriaCount);

        for (int index = 0; index < criteriaCount; index++) {
            int units = baseUnits + (index < remainderUnits ? 1 : 0);

            weights.add(
                    units / Math.pow(10, WEIGHT_SCALE)
            );
        }

        return weights;
    }

    @Transactional
    public CriterionResponse addCriterion(
            UUID performanceTableId,
            CriterionRequest request,
            UUID tutorId
    ) {
        PerformanceTable table = performanceTableRepository
                .findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Tabela de desempenho não encontrada: "
                                + performanceTableId
                ));

        validateTutorPermission(table, tutorId);

        List<Criterion> criteria = table.getCriteriaList();

        Criterion criterion = new Criterion();
        criterion.setName(request.getCriteriaName());
        criterion.setDescription(request.getCriteriaDescription());
        criterion.setPerformanceTable(table);

        Double requestedWeight = request.getCriteriaWeight();

        if (requestedWeight == null) {
            // Sem peso informado: redistribuir igualmente.
            List<Double> weights = distributeWeights(criteria.size() + 1);

            for (int index = 0; index < criteria.size(); index++) {
                criteria.get(index).setWeight(weights.get(index));
            }

            criterion.setWeight(weights.get(weights.size() - 1));

        } else {
            if (!Double.isFinite(requestedWeight)
                    || requestedWeight < 0
                    || requestedWeight > TOTAL_WEIGHT) {
                throw new InvalidWeightSumException(
                        "O peso deve estar entre 0 e 1."
                );
            }

            // Reduzir proporcionalmente os pesos existentes.
            if (criteria.isEmpty()) {
                if (Math.abs(requestedWeight - TOTAL_WEIGHT)
                        > WEIGHT_TOLERANCE) {
                    throw new InvalidWeightSumException(
                            "O primeiro critério deve possuir peso 1.0."
                    );
                }

                criterion.setWeight(TOTAL_WEIGHT);

            } else {
                double remainingWeight = TOTAL_WEIGHT - requestedWeight;

                List<Double> normalizedWeights = normalizeWeights(
                        criteria.stream()
                                .map(Criterion::getWeight)
                                .toList(),
                        remainingWeight
                );

                for (int index = 0; index < criteria.size(); index++) {
                    criteria.get(index).setWeight(normalizedWeights.get(index));
                }

                criterion.setWeight(requestedWeight);
            }
        }

        criteria.add(criterion);

        performanceTableRepository.save(table);

        Criterion saved = criterionRepository.save(criterion);

        return new CriterionResponse(
                saved.getId(),
                saved.getName(),
                saved.getDescription(),
                saved.getWeight(),
                "ACTIVE"
        );
    }

    @Transactional
    public void deleteCriterion(
            UUID performanceTableId,
            UUID criterionId,
            UUID tutorId
    ) {
        PerformanceTable table = performanceTableRepository
                .findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Tabela de desempenho não encontrada: "
                                + performanceTableId
                ));

        validateTutorPermission(table, tutorId);

        List<Criterion> criteria = table.getCriteriaList();

        Criterion criterion = criteria.stream()
                .filter(item -> item.getId().equals(criterionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Critério não encontrado nesta tabela: "
                                + criterionId
                ));

        if (criteria.size() <= 1) {
            throw new InvalidWeightSumException(
                    "Não é permitido remover o último critério da tabela."
            );
        }

        criteria.remove(criterion);

        List<Double> redistributedWeights = normalizeWeights(
                criteria.stream()
                        .map(Criterion::getWeight)
                        .toList(),
                TOTAL_WEIGHT
        );

        for (int index = 0; index < criteria.size(); index++) {
            criteria.get(index).setWeight(redistributedWeights.get(index));
        }

        // Remover explicitamente o registro persistido.
        criterionRepository.delete(criterion);

        performanceTableRepository.save(table);
    }

    @Transactional
    public PerformanceTableResponse updateCriteriaWeights(
            UUID performanceTableId,
            CriteriaWeightsRequest request,
            UUID tutorId
    ) {
        PerformanceTable table = performanceTableRepository
                .findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Tabela de desempenho não encontrada: "
                                + performanceTableId
                ));

        validateTutorPermission(table, tutorId);

        List<CriterionWeightRequest> requestedWeights =
                request.getWeights();

        if (requestedWeights == null || requestedWeights.isEmpty()) {
            throw new InvalidWeightSumException(
                    "É necessário manter pelo menos um critério."
            );
        }

        Set<UUID> requestedIds = validateCriteriaIds(
                table.getCriteriaList(),
                requestedWeights
        );

        List<Double> resolvedWeights = resolveWeightValues(
                requestedWeights.stream()
                        .map(CriterionWeightRequest::getCriteriaWeight)
                        .toList()
        );

        Map<UUID, Double> weightsByCriterionId = new HashMap<>();

        for (int index = 0; index < requestedWeights.size(); index++) {
            weightsByCriterionId.put(
                    requestedWeights.get(index).getCriterionId(),
                    resolvedWeights.get(index)
            );
        }

        List<Criterion> removedCriteria = table.getCriteriaList().stream()
                .filter(criterion -> !requestedIds.contains(criterion.getId()))
                .toList();

        table.getCriteriaList().removeAll(removedCriteria);

        table.getCriteriaList().forEach(criterion ->
                criterion.setWeight(
                        weightsByCriterionId.get(criterion.getId())
                )
        );

        criterionRepository.deleteAll(removedCriteria);

        return toResponse(performanceTableRepository.save(table));
    }

    @Transactional(readOnly = true)
    public PerformanceTableResponse getPerformanceTable(
            UUID performanceTableId
    ) {
        PerformanceTable table = performanceTableRepository
                .findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Tabela de desempenho não encontrada: "
                                + performanceTableId
                ));

        return toResponse(table);
    }

    private Set<UUID> validateCriteriaIds(
            List<Criterion> criteria,
            List<CriterionWeightRequest> requestedWeights
    ) {
        Set<UUID> requestedIds = new HashSet<>();

        for (CriterionWeightRequest requestedWeight : requestedWeights) {
            if (requestedWeight.getCriterionId() == null) {
                throw new InvalidWeightSumException(
                        "O identificador do critério não pode ser nulo."
                );
            }

            if (!requestedIds.add(requestedWeight.getCriterionId())) {
                throw new InvalidWeightSumException(
                        "Cada critério deve ser informado exatamente uma vez."
                );
            }
        }

        Set<UUID> criterionIds = criteria.stream()
                .map(Criterion::getId)
                .collect(Collectors.toSet());

        if (!criterionIds.containsAll(requestedIds)) {
            throw new InvalidWeightSumException(
                    "A requisição contém um critério que não pertence à tabela."
            );
        }

        return requestedIds;
    }

    private void validateTutorPermission(
            PerformanceTable table,
            UUID tutorId
    ) {
        Room ownerRoom = getOwnerRoom(table);

        if (!ownerRoom.getTutor().getId().equals(tutorId)) {
            throw new SecurityException(
                    "Apenas o tutor responsável pela sala pode gerenciar critérios."
            );
        }
    }

    private Room getOwnerRoom(PerformanceTable table) {
        if (table.getRoom() != null) {
            return table.getRoom();
        }

        if (table.getProblem() != null
                && table.getProblem().getRoom() != null) {
            return table.getProblem().getRoom();
        }

        throw new IllegalStateException(
                "A tabela de desempenho não está vinculada a uma sala."
        );
    }

    private PerformanceTableResponse toResponse(
            PerformanceTable table
    ) {
        List<CriterionResponse> criteriaResponses =
                table.getCriteriaList().stream()
                        .map(c -> new CriterionResponse(
                                c.getId(),
                                c.getName(),
                                c.getDescription(),
                                c.getWeight(),
                                "ACTIVE"
                        ))
                        .toList();

        Room ownerRoom = getOwnerRoom(table);

        return new PerformanceTableResponse(
                table.getId(),
                ownerRoom.getId(),
                table.getName(),
                "ACTIVE",
                criteriaResponses
        );
    }

    @Transactional(readOnly = true)
    public double calculateFinalGrade(
            UUID performanceTableId,
            Map<UUID, Double> gradesByCriterion
    ) {
        if (!performanceTableRepository.existsById(performanceTableId)) {
            throw new IllegalArgumentException(
                    "Tabela de desempenho não encontrada: "
                            + performanceTableId
            );
        }

        if (gradesByCriterion == null) {
            throw new IllegalArgumentException(
                    "As notas dos critérios devem ser informadas."
            );
        }

        List<Criterion> criteria = criterionRepository
                .findByPerformanceTableId(performanceTableId);

        return criteria.stream()
                .mapToDouble(criterion -> {
                    Double grade = gradesByCriterion.get(
                            criterion.getId()
                    );

                    if (grade == null) {
                        throw new IllegalArgumentException(
                                "Nota não informada para o critério: "
                                        + criterion.getId()
                        );
                    }

                    if (!Double.isFinite(grade)) {
                        throw new IllegalArgumentException(
                                "Nota inválida para o critério: "
                                        + criterion.getId()
                        );
                    }

                    return grade * criterion.getWeight();
                })
                .sum();
    }

    private List<Double> normalizeWeights(
            List<Double> originalWeights,
            double targetTotal
    ) {
        if (originalWeights == null || originalWeights.isEmpty()) {
            throw new InvalidWeightSumException(
                    "Não existem critérios para redistribuir os pesos."
            );
        }

        if (!Double.isFinite(targetTotal)
                || targetTotal < 0
                || targetTotal > TOTAL_WEIGHT) {
            throw new InvalidWeightSumException(
                    "O peso total solicitado é inválido."
            );
        }

        double total = 0;

        for (Double weight : originalWeights) {
            if (weight == null
                    || !Double.isFinite(weight)
                    || weight < 0) {
                throw new InvalidWeightSumException(
                        "Os pesos existentes são inválidos."
                );
            }

            total += weight;
        }

        if (total <= WEIGHT_TOLERANCE) {
            List<Double> equalWeights =
                    distributeWeights(originalWeights.size());

            List<Double> scaled = new ArrayList<>();

            for (double weight : equalWeights) {
                scaled.add(weight * targetTotal);
            }

            return scaled;
        }

        List<Double> normalized = new ArrayList<>();
        double accumulated = 0;

        for (int index = 0; index < originalWeights.size(); index++) {
            if (index == originalWeights.size() - 1) {
                normalized.add(
                        Math.max(0, targetTotal - accumulated)
                );
            } else {
                double weight =
                        originalWeights.get(index) / total * targetTotal;

                normalized.add(weight);
                accumulated += weight;
            }
        }

        return normalized;
    }
}
