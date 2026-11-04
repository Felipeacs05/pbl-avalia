package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
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

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("US07 - Integração de critérios da tabela de desempenho")
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
        tutor = persistUser("Tutor US07", "tutor.us07." + UUID.randomUUID()
                + "@avalia.edu");
        room = new Room();
        room.setName("Sala US07");
        room.setAccessCode("US07" + UUID.randomUUID());
        room.setTutor(tutor);
        room = roomRepository.save(room);
    }

    @Test
    @DisplayName("POST - Tutor adiciona critério à tabela e persiste")
    void addCriterion_Owner_PersistsCriterion() throws Exception {
        PerformanceTable table = persistTable(criterion("Postura", 1.0));
        CriterionRequest request =
                new CriterionRequest("Participação", "Envolvimento", 0.25);

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("Participação"))
                .andExpect(jsonPath("$.criteriaWeight").value(0.25));

        List<Criterion> criteria =
                criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(
                2,
                criteria.size(),
                criteria.stream()
                        .map(criterion -> criterion.getId() + ":"
                                + criterion.getName() + ":"
                                + criterion.getWeight())
                        .toList()
                        .toString()
        );
        assertEquals(0.75, criteria.get(0).getWeight());
        assertEquals(0.25, criteria.get(1).getWeight());
    }

    @Test
    @DisplayName("POST - Sem autenticação não adiciona critério")
    void addCriterion_Unauthenticated_Returns401() throws Exception {
        PerformanceTable table = persistTable();
        CriterionRequest request =
                new CriterionRequest("Postura", "Comportamento", 1.0);

        mockMvc.perform(post(criteriaUrl(table))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        assertTrue(criterionRepository
                .findByPerformanceTableId(table.getId()).isEmpty());
    }

    @Test
    @DisplayName("POST - Outro usuário não pode adicionar critério")
    void addCriterion_NonOwner_Returns403() throws Exception {
        PerformanceTable table = persistTable(criterion("Postura", 1.0));
        User otherUser = persistUser(
                "Outro usuário",
                "other.us07." + UUID.randomUUID() + "@avalia.edu"
        );
        CriterionRequest request =
                new CriterionRequest("Participação", "Envolvimento", 0.25);

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        assertEquals(
                1,
                criterionRepository.findByPerformanceTableId(table.getId()).size()
        );
    }

    @Test
    @DisplayName("POST - Tabela inexistente retorna 400")
    void addCriterion_UnknownTable_Returns400() throws Exception {
        CriterionRequest request =
                new CriterionRequest("Postura", "Comportamento", 1.0);

        mockMvc.perform(post("/api/v1/performance-tables/"
                        + UUID.randomUUID() + "/criteria")
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest(name = "[{index}] Rejeita payload inválido: {0}")
    @MethodSource("com.uefs.tfs.avaliasystem.US07.InvalidCriterionPayloads#provideInvalidCriterionRequests")
    @DisplayName("POST - Payload inválido não persiste critério")
    void addCriterion_InvalidPayload_Returns400(
            String scenario,
            CriterionRequest request
    ) throws Exception {
        PerformanceTable table = persistTable();
        int countBefore = criterionRepository.findAll().size();

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors").isMap());

        assertEquals(countBefore, criterionRepository.findAll().size(), scenario);
    }

    @Test
    @DisplayName("POST - Nome com 255 caracteres é aceito")
    void addCriterion_MaximumNameLength_Persists() throws Exception {
        PerformanceTable table = persistTable();
        String name = "A".repeat(255);
        CriterionRequest request = new CriterionRequest(name, "Descrição", 1.0);

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value(name));

        assertEquals(
                name,
                criterionRepository.findByPerformanceTableId(table.getId())
                        .get(0).getName()
        );
    }

    @Test
    @DisplayName("POST - Peso zero é aceito e redistribui o peso existente")
    void addCriterion_ZeroWeight_PersistsAndRedistributes() throws Exception {
        PerformanceTable table = persistTable(criterion("Postura", 1.0));
        CriterionRequest request =
                new CriterionRequest("Formativa", "Sem nota direta", 0.0);

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(0.0));

        List<Criterion> criteria =
                criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(1.0, criteria.get(0).getWeight());
        assertEquals(0.0, criteria.get(1).getWeight());
    }

    @Test
    @DisplayName("POST - Peso omitido distribui o peso igualmente")
    void addCriterion_WeightOmitted_DistributesEqually() throws Exception {
        PerformanceTable table = persistTable(criterion("Postura", 1.0));
        String request =
                "{\"criteriaName\":\"Participação\","
                        + "\"criteriaDescription\":\"Envolvimento\"}";

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(0.5));

        List<Criterion> criteria =
                criterionRepository.findByPerformanceTableId(table.getId());
        assertEquals(0.5, criteria.get(0).getWeight());
        assertEquals(0.5, criteria.get(1).getWeight());
    }

    @Test
    @DisplayName("POST - Nome somente com hífens é aceito")
    void addCriterion_HyphenName_IsAccepted() throws Exception {
        PerformanceTable table = persistTable();
        CriterionRequest request = new CriterionRequest("---", "Separador", 1.0);

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("---"));
    }

    @Test
    @DisplayName("POST - Nome com acentos é aceito")
    void addCriterion_AccentedName_IsAccepted() throws Exception {
        PerformanceTable table = persistTable();
        CriterionRequest request = new CriterionRequest(
                "Raciocínio Lógico",
                "Capacidade analítica",
                1.0
        );

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("Raciocínio Lógico"));
    }

    @Test
    @DisplayName("POST - Peso superior a 1 retorna 422 e não persiste")
    void addCriterion_WeightAboveOne_Returns422() throws Exception {
        PerformanceTable table = persistTable();
        CriterionRequest request =
                new CriterionRequest("Postura", "Comportamento", 1.1);

        mockMvc.perform(post(criteriaUrl(table))
                        .with(authenticatedAs(tutor))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity());

        assertTrue(criterionRepository
                .findByPerformanceTableId(table.getId()).isEmpty());
    }

    @Test
    @DisplayName("GET - Retorna a tabela e os critérios persistidos")
    void getPerformanceTable_ReturnsTableWithCriteria() throws Exception {
        PerformanceTable table = persistTable(criterion("Postura", 1.0));

        mockMvc.perform(get(tableUrl(table))
                        .with(authenticatedAs(tutor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.performanceTableId")
                        .value(table.getId().toString()))
                .andExpect(jsonPath("$.roomId").value(room.getId().toString()))
                .andExpect(jsonPath("$.criteriaList.length()").value(1))
                .andExpect(jsonPath("$.criteriaList[0].criteriaName")
                        .value("Postura"));
    }

    @Test
    @DisplayName("GET - Sem autenticação retorna 401")
    void getPerformanceTable_Unauthenticated_Returns401() throws Exception {
        PerformanceTable table = persistTable();

        mockMvc.perform(get(tableUrl(table)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET - Tabela inexistente retorna 400")
    void getPerformanceTable_UnknownTable_Returns400() throws Exception {
        mockMvc.perform(get("/api/v1/performance-tables/" + UUID.randomUUID())
                        .with(authenticatedAs(tutor)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET - Critérios de uma tabela não incluem critérios de outra tabela")
    void getPerformanceTable_DoesNotMixCriteriaAcrossTables() throws Exception {
        PerformanceTable requestedTable = persistTable(
                criterion("Critério da tabela solicitada", 1.0)
        );
        PerformanceTable anotherTable = persistTable(
                criterion("Critério da outra tabela", 1.0)
        );

        mockMvc.perform(get(tableUrl(requestedTable))
                        .with(authenticatedAs(tutor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criteriaList.length()").value(1))
                .andExpect(jsonPath("$.criteriaList[0].criteriaName")
                        .value("Critério da tabela solicitada"));

        assertFalse(requestedTable.getId().equals(anotherTable.getId()));
    }

    @Test
    @DisplayName("DELETE - Remove critério e redistribui o peso restante")
    void deleteCriterion_RemovesAndRedistributes() throws Exception {
        PerformanceTable table = persistTable(
                criterion("Postura", 0.4),
                criterion("Participação", 0.6)
        );
        UUID deletedId = table.getCriteriaList().get(0).getId();
        UUID remainingId = table.getCriteriaList().get(1).getId();

        mockMvc.perform(delete(criteriaUrl(table) + "/" + deletedId)
                        .with(authenticatedAs(tutor)))
                .andExpect(status().isNoContent());

        assertTrue(criterionRepository.findById(deletedId).isEmpty());
        assertEquals(
                1.0,
                criterionRepository.findById(remainingId).orElseThrow()
                        .getWeight()
        );
    }

    @Test
    @DisplayName("DELETE - Sem autenticação preserva o critério")
    void deleteCriterion_Unauthenticated_Returns401() throws Exception {
        PerformanceTable table = persistTable(
                criterion("Postura", 0.5),
                criterion("Participação", 0.5)
        );
        UUID criterionId = table.getCriteriaList().get(0).getId();

        mockMvc.perform(delete(criteriaUrl(table) + "/" + criterionId))
                .andExpect(status().isUnauthorized());

        assertTrue(criterionRepository.findById(criterionId).isPresent());
    }

    @Test
    @DisplayName("DELETE - Usuário que não é tutor recebe 403")
    void deleteCriterion_NonOwner_Returns403() throws Exception {
        PerformanceTable table = persistTable(
                criterion("Postura", 0.5),
                criterion("Participação", 0.5)
        );
        UUID criterionId = table.getCriteriaList().get(0).getId();
        User otherUser = persistUser(
                "Outro usuário",
                "other.delete.us07." + UUID.randomUUID() + "@avalia.edu"
        );

        mockMvc.perform(delete(criteriaUrl(table) + "/" + criterionId)
                        .with(authenticatedAs(otherUser)))
                .andExpect(status().isForbidden());

        assertTrue(criterionRepository.findById(criterionId).isPresent());
    }

    @Test
    @DisplayName("DELETE - Tabela inexistente retorna 400")
    void deleteCriterion_UnknownTable_Returns400() throws Exception {
        mockMvc.perform(delete("/api/v1/performance-tables/"
                        + UUID.randomUUID() + "/criteria/" + UUID.randomUUID())
                        .with(authenticatedAs(tutor)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE - Critério inexistente na tabela retorna 400")
    void deleteCriterion_UnknownCriterion_Returns400() throws Exception {
        PerformanceTable table = persistTable(
                criterion("Postura", 0.5),
                criterion("Participação", 0.5)
        );

        mockMvc.perform(delete(criteriaUrl(table) + "/" + UUID.randomUUID())
                        .with(authenticatedAs(tutor)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE - Critério de outra tabela não pode ser removido")
    void deleteCriterion_CriterionFromAnotherTable_Returns400() throws Exception {
        PerformanceTable firstTable = persistTable(
                criterion("Postura", 0.5),
                criterion("Participação", 0.5)
        );
        PerformanceTable secondTable = persistTable(
                criterion("Outro critério", 1.0)
        );
        UUID foreignCriterionId = secondTable.getCriteriaList().get(0).getId();

        mockMvc.perform(delete(criteriaUrl(firstTable) + "/" + foreignCriterionId)
                        .with(authenticatedAs(tutor)))
                .andExpect(status().isBadRequest());

        assertTrue(criterionRepository.findById(foreignCriterionId).isPresent());
    }

    @Test
    @DisplayName("DELETE - Não permite remover o último critério")
    void deleteCriterion_LastCriterion_Returns422() throws Exception {
        PerformanceTable table = persistTable(criterion("Postura", 1.0));
        UUID criterionId = table.getCriteriaList().get(0).getId();

        mockMvc.perform(delete(criteriaUrl(table) + "/" + criterionId)
                        .with(authenticatedAs(tutor)))
                .andExpect(status().isUnprocessableEntity());

        assertTrue(criterionRepository.findById(criterionId).isPresent());
    }

    private User persistUser(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword("senhaSegura123");
        return userRepository.save(user);
    }

    private PerformanceTable persistTable(Criterion... criteria) {
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela de desempenho");
        table.setRoom(room);
        table.setCriteriaList(new ArrayList<>());
        for (Criterion criterion : criteria) {
            criterion.setPerformanceTable(table);
            table.getCriteriaList().add(criterion);
        }
        return performanceTableRepository.save(table);
    }

    private Criterion criterion(String name, double weight) {
        Criterion criterion = new Criterion();
        criterion.setName(name);
        criterion.setDescription("Descrição de " + name);
        criterion.setWeight(weight);
        return criterion;
    }

    private RequestPostProcessor authenticatedAs(User user) {
        return jwt().jwt(jwt -> jwt.subject(user.getId().toString()));
    }

    private String tableUrl(PerformanceTable table) {
        return "/api/v1/performance-tables/" + table.getId();
    }

    private String criteriaUrl(PerformanceTable table) {
        return tableUrl(table) + "/criteria";
    }
}
