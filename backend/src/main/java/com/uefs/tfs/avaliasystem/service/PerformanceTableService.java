package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
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
import java.util.List;
import java.util.UUID;

@Service
public class PerformanceTableService {

    @Autowired
    private PerformanceTableRepository performanceTableRepository;

    @Autowired
    private CriterionRepository criterionRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Transactional
    public PerformanceTableResponse createPerformanceTable(PerformanceTableRequest request, UUID tutorId) {
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada com o ID fornecido: " + request.getRoomId()));

        if (!room.getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Apenas o tutor responsável pela sala pode criar tabelas de desempenho.");
        }

        PerformanceTable table = new PerformanceTable();
        table.setName(request.getTableName());
        table.setRoom(room);

        List<Criterion> criteria = new ArrayList<>();
        if (request.getCriteriaList() != null) {
            for (CriterionRequest cReq : request.getCriteriaList()) {
                Criterion c = new Criterion();
                c.setName(cReq.getCriteriaName());
                c.setDescription(cReq.getCriteriaDescription());
                c.setWeight(cReq.getCriteriaWeight() != null ? cReq.getCriteriaWeight() : 1.0);
                c.setPerformanceTable(table);
                criteria.add(c);
            }
        }
        table.setCriteriaList(criteria);

        PerformanceTable saved = performanceTableRepository.save(table);
        return toResponse(saved);
    }

    @Transactional
    public CriterionResponse addCriterion(UUID performanceTableId, CriterionRequest request, UUID tutorId) {
        PerformanceTable table = performanceTableRepository.findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException("Tabela de desempenho não encontrada: " + performanceTableId));

        if (!table.getRoom().getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Apenas o tutor responsável pela sala pode gerenciar critérios.");
        }

        Criterion criterion = new Criterion();
        criterion.setName(request.getCriteriaName());
        criterion.setDescription(request.getCriteriaDescription());
        criterion.setWeight(request.getCriteriaWeight() != null ? request.getCriteriaWeight() : 1.0);
        criterion.setPerformanceTable(table);

        Criterion saved = criterionRepository.save(criterion);
        return new CriterionResponse(saved.getId(), saved.getName(), saved.getDescription(), saved.getWeight(), "ACTIVE");
    }

    @Transactional
    public void deleteCriterion(UUID performanceTableId, UUID criterionId, UUID tutorId) {
        PerformanceTable table = performanceTableRepository.findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException("Tabela de desempenho não encontrada: " + performanceTableId));

        if (!table.getRoom().getTutor().getId().equals(tutorId)) {
            throw new SecurityException("Apenas o tutor responsável pela sala pode remover critérios.");
        }

        Criterion criterion = criterionRepository.findById(criterionId)
                .orElseThrow(() -> new IllegalArgumentException("Critério não encontrado: " + criterionId));

        if (!criterion.getPerformanceTable().getId().equals(performanceTableId)) {
            throw new IllegalArgumentException("O critério informado não pertence a esta tabela de desempenho.");
        }

        criterionRepository.delete(criterion);
    }

    @Transactional(readOnly = true)
    public PerformanceTableResponse getPerformanceTable(UUID performanceTableId) {
        PerformanceTable table = performanceTableRepository.findById(performanceTableId)
                .orElseThrow(() -> new IllegalArgumentException("Tabela de desempenho não encontrada: " + performanceTableId));
        return toResponse(table);
    }

    private PerformanceTableResponse toResponse(PerformanceTable table) {
        List<CriterionResponse> criteriaResponses = table.getCriteriaList().stream()
                .map(c -> new CriterionResponse(c.getId(), c.getName(), c.getDescription(), c.getWeight(), "ACTIVE"))
                .toList();

        return new PerformanceTableResponse(
                table.getId(),
                table.getRoom().getId(),
                table.getName(),
                "ACTIVE",
                criteriaResponses
        );
    }
}
