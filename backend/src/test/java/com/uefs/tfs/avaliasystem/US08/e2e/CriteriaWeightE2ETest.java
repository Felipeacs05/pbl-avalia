package com.uefs.tfs.avaliasystem.US08.e2e;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.CriteriaWeightsRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.CriterionWeightRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

// NÍVEL: E2E (topo da pirâmide - poucos testes, lentos e caros).
// Diferente do CriteriaWeightIntegrationTest (MockMvc, ainda dentro da JVM de teste), aqui um servidor
// Servlet real sobe numa porta aleatória e é chamado por HTTP real com TestRestTemplate e um JWT real,
// exatamente como o frontend faria. Nenhuma camada é mockada; só o banco físico é trocado pelo H2.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestConfig
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
class CriteriaWeightE2ETest {

    private static final String INVALID_SUM_MESSAGE = "A soma dos pesos deve ser exatamente 100% (1.0).";

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PerformanceTableRepository performanceTableRepository;

    @Autowired
    private CriterionRepository criterionRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    private User tutor;
    private PerformanceTable table;
    private UUID contentId;
    private UUID participationId;
    private UUID selfAssessmentId;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutora E2E US08");
        Room room = persistRoom("Sala E2E Pesos", tutor);

        // Tabela e critérios criados como a US07 os deixa: peso default 1.0
        PerformanceTable newTable = new PerformanceTable();
        newTable.setName("Tabela de Desempenho E2E");
        newTable.setRoom(room);
        newTable.getCriteriaList().add(newCriterion(newTable, "Conteúdo"));
        newTable.getCriteriaList().add(newCriterion(newTable, "Participação"));
        newTable.getCriteriaList().add(newCriterion(newTable, "Autoavaliação"));
        table = performanceTableRepository.save(newTable);

        Map<String, UUID> idsByName = table.getCriteriaList().stream()
                .collect(Collectors.toMap(Criterion::getName, Criterion::getId));
        contentId = idsByName.get("Conteúdo");
        participationId = idsByName.get("Participação");
        selfAssessmentId = idsByName.get("Autoavaliação");
    }

    // Sem @Transactional aqui: o servidor real atende a requisição em outra thread,
    // então uma transação de teste não cobriria a chamada HTTP. A limpeza segue a ordem das FKs
    // (os critérios saem junto com a tabela pelo cascade).
    @AfterEach
    void tearDown() {
        performanceTableRepository.deleteAll();
        roomRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpHeaders headersFor(User user) {
        // JWT real, assinado com o mesmo segredo que o servidor de teste usa para validar
        HttpHeaders headers = new HttpHeaders();
        headers.set("Content-Type", "application/json");
        headers.setBearerAuth(jwtService.generateToken(user.getId()));
        return headers;
    }

    private String weightsUrl() {
        return url("/api/v1/performance-tables/" + table.getId() + "/criteria/weights");
    }

    // --- JORNADA 1 (subtarefa de QA): 90%, 110% e 100%, na ordem da subtarefa ---

    @Test
    @DisplayName("[E2E][US08][QA] Tutor envia pesos com soma de 90%, 110% e 100%: 422, 422 e 200, e só a fórmula de 100% fica gravada")
    void qaJourney_SendWeightsSummingNinetyOneHundredTenAndOneHundredPercent() {
        // 1) 90%: rejeitado com 422 e nenhum peso alterado
        ResponseEntity<String> ninetyResponse = restTemplate.exchange(
                weightsUrl(), HttpMethod.PUT,
                new HttpEntity<>(weightsRequest(0.4, 0.3, 0.2), headersFor(tutor)),
                String.class);

        assertEquals(422, ninetyResponse.getStatusCode().value());
        assertNotNull(ninetyResponse.getBody());
        assertTrue(ninetyResponse.getBody().contains(INVALID_SUM_MESSAGE));
        assertEquals(Map.of(contentId, 1.0, participationId, 1.0, selfAssessmentId, 1.0), persistedWeights());

        // 2) 110%: rejeitado com 422 e nenhum peso alterado
        ResponseEntity<String> oneHundredTenResponse = restTemplate.exchange(
                weightsUrl(), HttpMethod.PUT,
                new HttpEntity<>(weightsRequest(0.4, 0.3, 0.4), headersFor(tutor)),
                String.class);

        assertEquals(422, oneHundredTenResponse.getStatusCode().value());
        assertNotNull(oneHundredTenResponse.getBody());
        assertTrue(oneHundredTenResponse.getBody().contains(INVALID_SUM_MESSAGE));
        assertEquals(Map.of(contentId, 1.0, participationId, 1.0, selfAssessmentId, 1.0), persistedWeights());

        // 3) 100%: aceito com 200, a resposta traz a fórmula nova e o banco a reflete
        ResponseEntity<PerformanceTableResponse> oneHundredResponse = restTemplate.exchange(
                weightsUrl(), HttpMethod.PUT,
                new HttpEntity<>(weightsRequest(0.4, 0.3, 0.3), headersFor(tutor)),
                PerformanceTableResponse.class);

        assertEquals(HttpStatus.OK, oneHundredResponse.getStatusCode());
        assertNotNull(oneHundredResponse.getBody());
        assertEquals(Map.of(contentId, 0.4, participationId, 0.3, selfAssessmentId, 0.3),
                oneHundredResponse.getBody().getCriteriaList().stream()
                        .collect(Collectors.toMap(CriterionResponse::getCriterionId, CriterionResponse::getCriteriaWeight)));
        // O nome não vem no payload: aparecer na resposta prova que o cliente recebe a tabela lida do banco
        assertEquals(Map.of(contentId, "Conteúdo", participationId, "Participação", selfAssessmentId, "Autoavaliação"),
                oneHundredResponse.getBody().getCriteriaList().stream()
                        .collect(Collectors.toMap(CriterionResponse::getCriterionId, CriterionResponse::getCriteriaName)));
        assertEquals(Map.of(contentId, 0.4, participationId, 0.3, selfAssessmentId, 0.3), persistedWeights());
    }

    // --- JORNADA 2 (IDOR): só o Tutor desta sala altera os pesos ---

    @Test
    @DisplayName("[E2E][US08] Tutor de outra sala recebe 403 ao alterar os pesos e nada muda no banco")
    void idorJourney_TutorOfAnotherRoomCannotChangeWeights() {
        // O intruso também é Tutor, mas de outra sala: a permissão deve estar ligada a esta sala específica
        User intruder = persistUser("Tutor Intruso E2E US08");
        persistRoom("Sala do Intruso E2E", intruder);

        ResponseEntity<String> attempt = restTemplate.exchange(
                weightsUrl(), HttpMethod.PUT,
                new HttpEntity<>(weightsRequest(0.6, 0.3, 0.1), headersFor(intruder)),
                String.class);

        assertEquals(HttpStatus.FORBIDDEN, attempt.getStatusCode());
        assertEquals(Map.of(contentId, 1.0, participationId, 1.0, selfAssessmentId, 1.0), persistedWeights());
    }

    // Helpers

    private CriteriaWeightsRequest weightsRequest(double content, double participation, double selfAssessment) {
        return new CriteriaWeightsRequest(List.of(
                new CriterionWeightRequest(contentId, content),
                new CriterionWeightRequest(participationId, participation),
                new CriterionWeightRequest(selfAssessmentId, selfAssessment)));
    }

    private Map<UUID, Double> persistedWeights() {
        return criterionRepository.findByPerformanceTableId(table.getId()).stream()
                .collect(Collectors.toMap(Criterion::getId, Criterion::getWeight));
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        user.setEmail("us08.e2e." + UUID.randomUUID().toString().substring(0, 6) + "@teste.com");
        user.setPassword("senha123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User owner) {
        Room room = new Room();
        room.setName(name);
        room.setAccessCode("E8" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        room.setTutor(owner);
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
