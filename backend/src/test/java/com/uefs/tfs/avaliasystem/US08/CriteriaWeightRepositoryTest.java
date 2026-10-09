package com.uefs.tfs.avaliasystem.US08;

import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

// Fatia de persistência apenas (H2 em memória, sem servidor web); cada teste sofre rollback
@DataJpaTest
@DisplayName("US08 - Testes de Repository dos pesos dos critérios da Tabela de Desempenho")
class CriteriaWeightRepositoryTest {

    @Autowired
    private PerformanceTableRepository performanceTableRepository;

    @Autowired
    private CriterionRepository criterionRepository;

    @Autowired
    private TestEntityManager entityManager;

    private PerformanceTable performanceTable;

    // Tutor, Sala e Tabela precisam existir fisicamente para satisfazer as chaves estrangeiras de Criterion
    @BeforeEach
    void setUp() {
        User tutor = new User();
        tutor.setEmail("tutor_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        tutor.setPassword("senha123");
        tutor.setName("Tutor Persistido");
        tutor = entityManager.persistFlushFind(tutor);

        Room room = new Room();
        room.setName("Sala de Pesos");
        room.setAccessCode("WGT01");
        room.setInviteLink("app/join/WGT01");
        room.setTutor(tutor);
        room = entityManager.persistFlushFind(room);

        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Padrão");
        table.setRoom(room);
        // Pesos iniciais da US07 (default 1.0), ainda sem a fórmula da US08
        table.getCriteriaList().add(newCriterion(table, "Conteúdo"));
        table.getCriteriaList().add(newCriterion(table, "Participação"));
        table.getCriteriaList().add(newCriterion(table, "Autoavaliação"));
        performanceTable = entityManager.persistFlushFind(table);
    }

    // --- ESCRITA REAL DOS NOVOS PESOS ---

    @Test
    @DisplayName("Deve persistir os novos pesos ao salvar a tabela, atualizando os mesmos critérios sem criar novos")
    void save_WithUpdatedCriteriaWeights_PersistsWeightsInSameCriteria() {
        // Arrange (Preparar)
        Map<String, Double> newWeights = Map.of("Conteúdo", 0.6, "Participação", 0.3, "Autoavaliação", 0.1);
        PerformanceTable table = performanceTableRepository.findById(performanceTable.getId()).orElseThrow();
        List<UUID> originalIds = table.getCriteriaList().stream().map(Criterion::getId).toList();
        table.getCriteriaList().forEach(c -> c.setWeight(newWeights.get(c.getName())));

        // Act (Executar)
        performanceTableRepository.save(table);

        // Força a leitura abaixo a ir ao banco em vez do contexto de persistência
        entityManager.flush();
        entityManager.clear();

        // Assert (Validar)
        List<Criterion> persisted = criterionRepository.findByPerformanceTableId(performanceTable.getId());
        // Mesmas linhas da US07: a alteração de pesos não pode recriar critérios (ids mudariam)
        assertEquals(Set.copyOf(originalIds), persisted.stream().map(Criterion::getId).collect(Collectors.toSet()));

        Map<String, Double> byName = persisted.stream()
                .collect(Collectors.toMap(Criterion::getName, Criterion::getWeight));
        assertEquals(newWeights, byName);
    }

    // Helpers

    private Criterion newCriterion(PerformanceTable table, String name) {
        Criterion criterion = new Criterion();
        criterion.setName(name);
        criterion.setDescription("Descrição de " + name);
        criterion.setWeight(1.0);
        criterion.setPerformanceTable(table);
        return criterion;
    }
}
