package com.uefs.tfs.avaliasystem.US08;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.CriteriaWeightsRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionWeightRequest;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.PerformanceTableService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// NÍVEL: INTEGRAÇÃO (meio da pirâmide).
// Diferente do CriteriaWeightControllerTest (Service mockado) e do CriteriaWeightServiceTest (Repositories
// mockados), aqui sobe o contexto Spring inteiro: Controller, Service e Repository reais conversando com o H2
// via MockMvc. Objetivo: pegar falhas de "cola" entre as camadas (exceção -> 422, serialização real do DTO,
// pesos aplicados por id e gravados numa única transação, fórmula salva usada no cálculo).
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("US08 - Testes de Integração dos pesos dos critérios (Spring Context + H2 DB)")
class CriteriaWeightIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PerformanceTableService performanceTableService;

    @Autowired
    private PerformanceTableRepository performanceTableRepository;

    @Autowired
    private CriterionRepository criterionRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private User tutor;
    private PerformanceTable table;
    private UUID contentId;
    private UUID participationId;
    private UUID selfAssessmentId;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor Integração US08");
        Room room = persistRoom("Módulo Tutorial Pesos", tutor);

        // Tabela e critérios criados como a US07 os deixa: peso default 1.0
        PerformanceTable newTable = new PerformanceTable();
        newTable.setName("Tabela de Desempenho");
        newTable.setRoom(room);
        newTable.getCriteriaList().add(newCriterion(newTable, "Conteúdo"));
        newTable.getCriteriaList().add(newCriterion(newTable, "Participação"));
        newTable.getCriteriaList().add(newCriterion(newTable, "Autoavaliação"));
        table = performanceTableRepository.save(newTable);
        entityManager.flush();

        Map<String, UUID> idsByName = table.getCriteriaList().stream()
                .collect(Collectors.toMap(Criterion::getName, Criterion::getId));
        contentId = idsByName.get("Conteúdo");
        participationId = idsByName.get("Participação");
        selfAssessmentId = idsByName.get("Autoavaliação");

        // Sem isto o Service receberia a tabela do cache do contexto de persistência; limpando, ele
        // precisa carregar tabela e critérios (OneToMany LAZY) do H2, como acontece em produção
        entityManager.clear();
    }

    private RequestPostProcessor authenticatedAs(String userId) {
        return jwt().jwt(j -> j.subject(userId));
    }

    // --- QA: SOMA DE 100% ATRAVÉS DE TODAS AS CAMADAS ---

    @Test
    @DisplayName("[QA] PUT com soma de 100% deve atravessar Controller, Service e Repository e gravar cada peso no seu critério")
    void updateCriteriaWeights_ThroughFullStack_WithSumOfOneHundredPercent_PersistsWeights() throws Exception {
        // Arrange (Preparar)
        // 0.35 + 0.29 + 0.36 = 0.9999999999999999 em Double: só passa com comparação tolerante
        CriteriaWeightsRequest request = weightsRequest(0.35, 0.29, 0.36);

        // Act (Executar)
        mockMvc.perform(put("/api/v1/performance-tables/" + table.getId() + "/criteria/weights")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.performanceTableId").value(table.getId().toString()))
                .andExpect(jsonPath("$.criteriaList.length()").value(3))
                // Serialização real da resposta: cada critério volta com o seu peso novo
                .andExpect(jsonPath("$.criteriaList[?(@.criterionId == '" + contentId + "')].criteriaWeight").value(0.35))
                .andExpect(jsonPath("$.criteriaList[?(@.criterionId == '" + participationId + "')].criteriaWeight").value(0.29))
                .andExpect(jsonPath("$.criteriaList[?(@.criterionId == '" + selfAssessmentId + "')].criteriaWeight").value(0.36))
                // O nome não vem no payload: aparecer na resposta prova que ela foi montada a partir do banco
                .andExpect(jsonPath("$.criteriaList[?(@.criterionId == '" + selfAssessmentId + "')].criteriaName").value("Autoavaliação"));

        // Força a leitura abaixo a ir ao banco em vez do contexto de persistência
        entityManager.flush();
        entityManager.clear();

        // Assert (Validar)
        // Prova de que a requisição passou por todas as camadas: os pesos estão nas linhas reais dos critérios
        assertEquals(Map.of(contentId, 0.35, participationId, 0.29, selfAssessmentId, 0.36), persistedWeights());
    }

    // --- QA: SOMAS DE 90% E 110% ATRAVÉS DE TODAS AS CAMADAS ---

    @ParameterizedTest(name = "[{index}] Autoavaliação {0} -> soma {1}")
    @CsvSource({"0.2, 90%", "0.4, 110%"})
    @DisplayName("[QA] PUT com soma diferente de 100% deve retornar 422 com a mensagem e não alterar nenhum peso no banco")
    void updateCriteriaWeights_ThroughFullStack_WithInvalidSum_Returns422_AndPersistsNothing(double selfAssessmentWeight, String sum) throws Exception {
        // Arrange (Preparar)
        CriteriaWeightsRequest request = weightsRequest(0.4, 0.3, selfAssessmentWeight);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(put("/api/v1/performance-tables/" + table.getId() + "/criteria/weights")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.message").value("A soma dos pesos deve ser exatamente 100% (1.0)."));

        entityManager.flush();
        entityManager.clear();
        assertEquals(Map.of(contentId, 1.0, participationId, 1.0, selfAssessmentId, 1.0), persistedWeights());
    }

    // --- POSSE DA SALA ---

    @Test
    @DisplayName("PUT pelo tutor de outra sala deve retornar 403 e não alterar nenhum peso no banco")
    void updateCriteriaWeights_ByTutorOfAnotherRoom_Returns403_AndPersistsNothing() throws Exception {
        // Arrange (Preparar)
        // O intruso também é Tutor, mas de outra sala: a permissão deve estar ligada a esta sala específica
        User intruder = persistUser("Tutor Intruso US08");
        persistRoom("Sala do Intruso", intruder);
        CriteriaWeightsRequest request = weightsRequest(0.6, 0.3, 0.1);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(put("/api/v1/performance-tables/" + table.getId() + "/criteria/weights")
                        .with(authenticatedAs(intruder.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals(Map.of(contentId, 1.0, participationId, 1.0, selfAssessmentId, 1.0), persistedWeights());
    }

    // --- FÓRMULA SALVA -> CÁLCULO DA NOTA FINAL ---

    @Test
    @DisplayName("Os pesos salvos via PUT devem ser os usados no cálculo da nota final, incluindo a autoavaliação")
    void calculateFinalGrade_AfterWeightsSavedThroughFullStack_UsesPersistedFormula() throws Exception {
        // Arrange (Preparar)
        mockMvc.perform(put("/api/v1/performance-tables/" + table.getId() + "/criteria/weights")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(weightsRequest(0.4, 0.3, 0.3))))
                .andExpect(status().isOk());

        entityManager.flush();
        entityManager.clear();

        // Act (Executar)
        double finalGrade = performanceTableService.calculateFinalGrade(table.getId(), Map.of(
                contentId, 8.0,
                participationId, 6.0,
                selfAssessmentId, 10.0));

        // Assert (Validar)
        // 8.0*0.4 + 6.0*0.3 + 10.0*0.3 = 8.0; com os pesos antigos (1.0 cada) daria 24.0,
        // e sem a autoavaliação daria 5.0
        assertEquals(8.0, finalGrade, 1e-9);
    }

    // --- HELPERS ---

    // Ordem do payload invertida em relação à tabela: o peso deve ser aplicado pelo criterionId, não pela posição
    private CriteriaWeightsRequest weightsRequest(double content, double participation, double selfAssessment) {
        return new CriteriaWeightsRequest(List.of(
                new CriterionWeightRequest(selfAssessmentId, selfAssessment),
                new CriterionWeightRequest(participationId, participation),
                new CriterionWeightRequest(contentId, content)));
    }

    private Map<UUID, Double> persistedWeights() {
        return criterionRepository.findByPerformanceTableId(table.getId()).stream()
                .collect(Collectors.toMap(Criterion::getId, Criterion::getWeight));
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        user.setEmail("us08." + UUID.randomUUID().toString().substring(0, 6) + "@avalia.edu");
        user.setPassword("senhaSegura123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User tutorUser) {
        Room room = new Room();
        room.setName(name);
        room.setAccessCode("W8" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        room.setTutor(tutorUser);
        return roomRepository.save(room);
    }

    private Criterion newCriterion(PerformanceTable targetTable, String name) {
        Criterion criterion = new Criterion();
        criterion.setName(name);
        criterion.setDescription("Descrição de " + name);
        criterion.setWeight(1.0);
        criterion.setPerformanceTable(targetTable);
        return criterion;
    }
}
