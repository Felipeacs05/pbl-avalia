package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableRequest;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("US07 - Testes de Integração Ponta a Ponta (Spring Context + H2 DB)")
class PerformanceTableIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PerformanceTableRepository performanceTableRepository;

    @Autowired
    private CriterionRepository criterionRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    private User tutor;
    private Room room;

    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setName("Tutor Integração");
        tutor.setEmail("tutor.us07." + UUID.randomUUID().toString().substring(0, 6) + "@avalia.edu");
        tutor.setPassword("senhaSegura123");
        tutor = userRepository.save(tutor);

        room = new Room();
        room.setName("Módulo Tutorial Integrado");
        room.setAccessCode("US07" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        room.setTutor(tutor);
        room = roomRepository.save(room);
    }

    private RequestPostProcessor authenticatedAs(String userId) {
        return jwt().jwt(j -> j.subject(userId));
    }

    @Test
    @DisplayName("Deve persistir a tabela e sua lista de critérios no banco H2 com sucesso via POST")
    void createPerformanceTable_ThroughFullStack_PersistsTableAndCriteriaInDatabase() throws Exception {
        CriterionRequest c1 = new CriterionRequest("Postura", "Ética profissional", 4.0);
        CriterionRequest c2 = new CriterionRequest("Raciocínio Lógico", "Análise crítica", 6.0);
        PerformanceTableRequest request = new PerformanceTableRequest(room.getId(), "Tabela Semestral de Desempenho", List.of(c1, c2));

        mockMvc.perform(post("/api/v1/performance-tables")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.performanceTableId").isNotEmpty())
                .andExpect(jsonPath("$.tableName").value("Tabela Semestral de Desempenho"))
                .andExpect(jsonPath("$.criteriaList").isArray())
                .andExpect(jsonPath("$.criteriaList.length()").value(2));

        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        assertEquals(1, tables.size());
        assertEquals("Tabela Semestral de Desempenho", tables.get(0).getName());

        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(tables.get(0).getId());
        assertEquals(2, criteria.size());
    }

    @Test
    @DisplayName("Deve adicionar critério individual a uma tabela já existente persistindo no banco")
    void addCriterion_ThroughFullStack_PersistsCriterionLinkedToTable() throws Exception {
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Existente");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        CriterionRequest newCriterion = new CriterionRequest("Pontualidade", "Chegada no horário", 2.0);

        mockMvc.perform(post("/api/v1/performance-tables/" + table.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCriterion)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criterionId").isNotEmpty())
                .andExpect(jsonPath("$.criteriaName").value("Pontualidade"));

        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(1, criteria.size());
        assertEquals("Pontualidade", criteria.get(0).getName());
    }

    @Test
    @DisplayName("Deve remover critério existente do banco de dados via DELETE")
    void deleteCriterion_ThroughFullStack_RemovesCriterionFromDatabase() throws Exception {
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela com Critério");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        Criterion criterion = new Criterion();
        criterion.setName("Critério para Deletar");
        criterion.setWeight(1.0);
        criterion.setPerformanceTable(table);
        criterion = criterionRepository.save(criterion);

        mockMvc.perform(delete("/api/v1/performance-tables/" + table.getId() + "/criteria/" + criterion.getId())
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isNoContent());

        assertTrue(criterionRepository.findById(criterion.getId()).isEmpty());
    }

    @Test
    @DisplayName("Deve validar DTO e fazer rollback se criteriaName for vazio")
    void createPerformanceTable_WithEmptyCriteriaName_RollbacksAndReturns400() throws Exception {
        CriterionRequest invalidCriterion = new CriterionRequest("", "Sem nome", 1.0);
        PerformanceTableRequest request = new PerformanceTableRequest(room.getId(), "Tabela", List.of(invalidCriterion));

        mockMvc.perform(post("/api/v1/performance-tables")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        assertTrue(tables.isEmpty());
    }
}
