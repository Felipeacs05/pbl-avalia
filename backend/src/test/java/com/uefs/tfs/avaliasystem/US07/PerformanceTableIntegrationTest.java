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
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    private User persistUser(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword("senhaSegura123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User tutorUser) {
        Room r = new Room();
        r.setName(name);
        r.setAccessCode("RM" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        r.setTutor(tutorUser);
        return roomRepository.save(r);
    }

    // =========================================================================
    // TESTES EXISTENTES (PRESERVADOS CONFORME REGRAS)
    // =========================================================================

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

    // =========================================================================
    // NOVOS TESTES: REJEIÇÃO PARAMETRIZADA NO POST /criteria (ITEM A)
    // =========================================================================

    @ParameterizedTest(name = "[{index}] Rejeição no H2 para: {0}")
    @MethodSource("com.uefs.tfs.avaliasystem.US07.InvalidCriterionPayloads#provideInvalidCriterionRequests")
    @DisplayName("Deve validar DTO na inclusão de critérios, rejeitar com 400 e não persistir no banco H2")
    void addCriterion_WithInvalidPayloads_RollbacksAndReturns400(String scenario, CriterionRequest invalidRequest) throws Exception {
        // Arrange (Preparar)
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Validação");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        int initialCount = criterionRepository.findByPerformanceTableId(table.getId()).size();

        // Act (Executar)
        mockMvc.perform(post("/api/v1/performance-tables/" + table.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors").isMap());

        // Assert (Validar integridade do banco)
        List<Criterion> criteriaAfter = criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(initialCount, criteriaAfter.size(), "Nenhum registro deve ser inserido no banco para payload inválido: " + scenario);
    }

    @Test
    @DisplayName("Deve aceitar e persistir no banco critério com nome no limite máximo de 255 caracteres")
    void addCriterion_WithNameWith255Characters_PersistsSuccessfully() throws Exception {
        // Arrange (Preparar)
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Limite 255");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        String maxValidName = "A".repeat(255);
        CriterionRequest request = new CriterionRequest(maxValidName, "Descrição no limite", 2.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/performance-tables/" + table.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criterionId").isNotEmpty())
                .andExpect(jsonPath("$.criteriaName").value(maxValidName));

        // Assert (Validar)
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(1, criteria.size());
        assertEquals(maxValidName, criteria.get(0).getName());
    }

    // =========================================================================
    // NOVOS TESTES: AUTORIZAÇÃO REAL (ITEM C)
    // =========================================================================

    @Test
    @DisplayName("Deve retornar 403 e não persistir critério se usuário autenticado não for o tutor da sala")
    void addCriterion_WhenUserIsNotRoomTutor_Returns403AndDoesNotPersist() throws Exception {
        // Arrange (Preparar)
        User nonTutor = persistUser("Não Tutor", "nontutor." + UUID.randomUUID() + "@avalia.edu");

        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela de Segurança");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        CriterionRequest request = new CriterionRequest("Tentativa Indevida", "Não autorizado", 1.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/performance-tables/" + table.getId() + "/criteria")
                        .with(authenticatedAs(nonTutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Assert (Validar integridade do banco)
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(table.getId());
        assertTrue(criteria.isEmpty(), "Critério não deve ser salvo no banco quando usuário não é o tutor da sala");
    }

    @Test
    @DisplayName("Deve retornar 403 e não remover critério se usuário autenticado não for o tutor da sala")
    void deleteCriterion_WhenUserIsNotRoomTutor_Returns403AndDoesNotDelete() throws Exception {
        // Arrange (Preparar)
        User nonTutor = persistUser("Não Tutor", "nontutor." + UUID.randomUUID() + "@avalia.edu");

        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela com Critério Protegido");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        Criterion criterion = new Criterion();
        criterion.setName("Critério Intacto");
        criterion.setWeight(2.0);
        criterion.setPerformanceTable(table);
        criterion = criterionRepository.save(criterion);

        // Act (Executar)
        mockMvc.perform(delete("/api/v1/performance-tables/" + table.getId() + "/criteria/" + criterion.getId())
                        .with(authenticatedAs(nonTutor.getId().toString())))
                .andExpect(status().isForbidden());

        // Assert (Validar permanência no banco)
        assertTrue(criterionRepository.findById(criterion.getId()).isPresent(), "O critério deve permanecer no banco quando a exclusão for negada");
    }

    @Test
    @DisplayName("BUG: Deve retornar 403 ao consultar tabela por usuário sem vínculo com a sala (Falha real no código)")
    void getPerformanceTable_WhenUserHasNoLinkToRoom_Returns403() throws Exception {
        // Arrange (Preparar)
        User unrelatedUser = persistUser("Usuário Estranho", "estranho." + UUID.randomUUID() + "@avalia.edu");

        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Restrita da Sala");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        // Act & Assert (Executar e Validar)
        // O código atual do PerformanceTableController/Service não recebe autenticação nem valida vínculo de sala no GET.
        // A asserção correta de segurança exige 403 Forbidden para garantir o isolamento entre turmas.
        mockMvc.perform(get("/api/v1/performance-tables/" + table.getId())
                        .with(authenticatedAs(unrelatedUser.getId().toString())))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // NOVOS TESTES: BORDAS DE NEGÓCIO E LIMITES (ITEM D)
    // =========================================================================

    @Test
    @DisplayName("Deve retornar 400 ao tentar adicionar critério a tabela inexistente")
    void addCriterion_WhenTableDoesNotExist_Returns400() throws Exception {
        // Arrange (Preparar)
        String nonExistentTableId = UUID.randomUUID().toString();
        CriterionRequest request = new CriterionRequest("Liderança", "Proatividade", 1.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/" + nonExistentTableId + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Tabela de desempenho não encontrada: " + nonExistentTableId));
    }

    @Test
    @DisplayName("Deve retornar 400 ao tentar remover critério de tabela inexistente")
    void deleteCriterion_WhenTableDoesNotExist_Returns400() throws Exception {
        // Arrange (Preparar)
        String nonExistentTableId = UUID.randomUUID().toString();

        // Act & Assert (Executar e Validar)
        UUID criterionId = UUID.randomUUID();
        mockMvc.perform(delete("/api/v1/performance-tables/" + nonExistentTableId + "/criteria/" + criterionId)
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Tabela de desempenho não encontrada: " + nonExistentTableId));
    }

    @Test
    @DisplayName("Deve retornar 400 ao tentar remover critério inexistente no banco")
    void deleteCriterion_WhenCriterionDoesNotExist_Returns400() throws Exception {
        // Arrange (Preparar)
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Existente");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        UUID nonExistentCriterionId = UUID.randomUUID();

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/performance-tables/" + table.getId() + "/criteria/" + nonExistentCriterionId)
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Critério não encontrado: " + nonExistentCriterionId));
    }

    @Test
    @DisplayName("Deve retornar 400 ao tentar remover critério associado a outra tabela de desempenho")
    void deleteCriterion_WhenCriterionBelongsToAnotherTable_Returns400AndPreservesDatabase() throws Exception {
        // Arrange (Preparar)
        PerformanceTable tableA = new PerformanceTable();
        tableA.setName("Tabela A");
        tableA.setRoom(room);
        tableA = performanceTableRepository.save(tableA);

        PerformanceTable tableB = new PerformanceTable();
        tableB.setName("Tabela B");
        tableB.setRoom(room);
        tableB = performanceTableRepository.save(tableB);

        Criterion criterionB = new Criterion();
        criterionB.setName("Critério da Tabela B");
        criterionB.setWeight(1.5);
        criterionB.setPerformanceTable(tableB);
        criterionB = criterionRepository.save(criterionB);

        // Act (Executar tentativa de exclusão passando Table A com Criterion de Table B)
        mockMvc.perform(delete("/api/v1/performance-tables/" + tableA.getId() + "/criteria/" + criterionB.getId())
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("O critério informado não pertence a esta tabela de desempenho."));

        // Assert (Validar persistência no banco)
        assertTrue(criterionRepository.findById(criterionB.getId()).isPresent(), "O critério da Tabela B deve permanecer intacto no banco de dados");
    }

    @Test
    @DisplayName("Deve retornar 400 e não persistir tabela se criteriaList for enviada vazia")
    void createPerformanceTable_WhenCriteriaListIsEmpty_Returns400AndDoesNotPersist() throws Exception {
        // Arrange (Preparar)
        PerformanceTableRequest request = new PerformanceTableRequest(room.getId(), "Tabela Sem Critérios", List.of());

        // Act (Executar)
        mockMvc.perform(post("/api/v1/performance-tables")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.criteriaList").value("A lista de critérios não pode estar vazia"));

        // Assert (Validar)
        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        assertTrue(tables.isEmpty(), "Nenhuma tabela deve ser persistida quando criteriaList estiver vazia");
    }

    @Test
    @DisplayName("Deve persistir critério formado exclusivamente por hífens com status 201")
    void addCriterion_WhenNameHasOnlyHyphens_PersistsSuccessfully() throws Exception {
        // Arrange (Preparar)
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Hífens");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        CriterionRequest request = new CriterionRequest("---", "Critério separador", 1.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/performance-tables/" + table.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("---"));

        // Assert (Validar)
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(1, criteria.size());
        assertEquals("---", criteria.get(0).getName());
    }

    @Test
    @DisplayName("Deve persistir critério contendo caracteres acentuados da língua portuguesa")
    void addCriterion_WhenNameHasAccents_PersistsSuccessfully() throws Exception {
        // Arrange (Preparar)
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela de Língua Portuguesa");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        CriterionRequest request = new CriterionRequest("Raciocínio Lógico e Dedução", "Capacidade analítica", 3.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/performance-tables/" + table.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("Raciocínio Lógico e Dedução"));

        // Assert (Validar)
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(1, criteria.size());
        assertEquals("Raciocínio Lógico e Dedução", criteria.get(0).getName());
    }

    @Test
    @DisplayName("Deve persistir critério com peso 0.0 (limite inferior não negativo) no banco H2")
    void addCriterion_WhenWeightIsZero_PersistsSuccessfully() throws Exception {
        // Arrange (Preparar)
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Peso Zero");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        CriterionRequest request = new CriterionRequest("Atividade Formativa", "Sem peso na nota final", 0.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/performance-tables/" + table.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(0.0));

        // Assert (Validar)
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(1, criteria.size());
        assertEquals(0.0, criteria.get(0).getWeight());
    }

    @Test
    @DisplayName("Deve persistir critério com peso padrão 1.0 quando o peso for omitido no JSON")
    void addCriterion_WhenWeightIsOmitted_PersistsWithDefaultWeightOne() throws Exception {
        // Arrange (Preparar)
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Peso Padrão");
        table.setRoom(room);
        table = performanceTableRepository.save(table);

        String jsonWithoutWeight = "{\"criteriaName\": \"Participação Efetiva\", \"criteriaDescription\": \"Presença ativa\"}";

        // Act (Executar)
        mockMvc.perform(post("/api/v1/performance-tables/" + table.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithoutWeight))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(1.0));

        // Assert (Validar)
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(1, criteria.size());
        assertEquals(1.0, criteria.get(0).getWeight(), "O peso gravado no banco deve ser 1.0 por padrão");
    }

    // =========================================================================
    // ITENS E & F: LACUNAS DE NEGÓCIO NÃO IMPLEMENTADAS (@Disabled)
    // =========================================================================

    @Test
    @Disabled("US07 - funcionalidade não implementada: edição de tabelas e critérios (PUT/PATCH)")
    @DisplayName("Contrato esperado: Deve atualizar nome da tabela existente via PUT persistindo no banco")
    void updatePerformanceTable_WhenPutMethodCalled_ExpectDisabled() throws Exception {
        // Contrato esperado: PUT /api/v1/performance-tables/{id}
        mockMvc.perform(put("/api/v1/performance-tables/tbl-qualquer")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tableName\": \"Novo Nome\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @Disabled("US07 - funcionalidade não implementada: seleção/ativação de critérios")
    @DisplayName("Contrato esperado: Deve ativar/desativar critério via PATCH persistindo alteração no banco")
    void toggleCriterionActiveStatus_WhenEndpointCalled_ExpectDisabled() throws Exception {
        // Contrato esperado: PATCH /api/v1/performance-tables/{id}/criteria/{criterionId}/status
        mockMvc.perform(patch("/api/v1/performance-tables/" + UUID.randomUUID() + "/criteria/" + UUID.randomUUID() + "/status")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"INACTIVE\"}"))
                .andExpect(status().isOk());
    }
}
