package com.uefs.tfs.avaliasystem.US11.e2e;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.BehaviorRecordRequest;
import com.uefs.tfs.avaliasystem.dto.BehaviorRecordResponse;
import com.uefs.tfs.avaliasystem.dto.BehaviorTagResponse;
import com.uefs.tfs.avaliasystem.model.BehaviorRecord;
import com.uefs.tfs.avaliasystem.model.BehaviorTag;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.BehaviorRecordRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorTagRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.JwtService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

// NÍVEL: E2E. Servidor real em porta aleatória, HTTP real com TestRestTemplate e JWT real.
// Nenhuma camada é mockada; o Clock é o bean real, então o horário é conferido entre o antes e o depois da requisição.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestConfig
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
class BehaviorRecordE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private BehaviorRecordRepository behaviorRecordRepository;

    @Autowired
    private BehaviorTagRepository behaviorTagRepository;

    @Autowired
    private TutoringSessionRepository tutoringSessionRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private TransactionTemplate transactionTemplate;

    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode registrar comportamentos.";
    private static final String TEXT_TOO_LONG_MESSAGE = "O texto deve ter no máximo 500 caracteres.";

    // Sufixo nos nomes: tags semeadas pela implementação coexistem no banco e não podem ser apagadas no tearDown
    private static final String TAG_SUFFIX = " US11 E2E";

    private User tutor;
    private User student;
    private TutoringSession session;
    private UUID lateTagId;
    private final List<UUID> createdTagIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);
        tutor = persistUser("Tutor E2E");
        student = persistUser("Aluno E2E");
        Room room = persistRoom("Sala do Comportamento E2E", tutor);
        persistStudentMember(room, student);
        session = persistSession(room);
        persistTag("Celular fora de contexto" + TAG_SUFFIX);
        lateTagId = persistTag("Atraso" + TAG_SUFFIX);
    }

    // Sem @Transactional: o servidor atende em outra thread. Limpeza na ordem das FKs.
    @AfterEach
    void tearDown() {
        behaviorRecordRepository.deleteAll();
        // Só as tags criadas aqui: as semeadas pertencem à aplicação
        behaviorTagRepository.deleteAllById(createdTagIds);
        createdTagIds.clear();
        tutoringSessionRepository.deleteAll();
        problemRepository.deleteAll();
        transactionTemplate.executeWithoutResult(status ->
                entityManager.createQuery("DELETE FROM RoomMember").executeUpdate());
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

    // --- JORNADA 1: registro rápido durante a sessão ---

    @Test
    @DisplayName("[E2E][US11] Tutor lista as tags, toca duas vezes em Atraso e adiciona um texto livre; cada envio vira um registro no perfil do aluno")
    void behaviorJourney_ListTagsTapTagTwiceThenAddText_WorksEndToEnd() {
        // 1) A tela carrega as tags predefinidas, em ordem alfabética
        ResponseEntity<BehaviorTagResponse[]> tagsResponse = restTemplate.exchange(
                url("/api/v1/behavior-tags"), HttpMethod.GET,
                new HttpEntity<>(headersFor(tutor)), BehaviorTagResponse[].class);

        assertEquals(HttpStatus.OK, tagsResponse.getStatusCode());
        assertNotNull(tagsResponse.getBody());
        List<BehaviorTagResponse> tags = Arrays.stream(tagsResponse.getBody())
                .filter(t -> t.getName().endsWith(TAG_SUFFIX))
                .toList();
        assertEquals(List.of("Atraso" + TAG_SUFFIX, "Celular fora de contexto" + TAG_SUFFIX),
                tags.stream().map(BehaviorTagResponse::getName).toList());
        UUID listedTagId = tags.get(0).getId();
        assertEquals(lateTagId, listedTagId);

        // 2) Toque na tag: o id listado vai direto no registro, sem etapa intermediária
        Instant beforeTap = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        ResponseEntity<BehaviorRecordResponse> firstTap =
                postRecord(tutor, new BehaviorRecordRequest(listedTagId, null), BehaviorRecordResponse.class);
        Instant afterTap = Instant.now();

        assertEquals(HttpStatus.CREATED, firstTap.getStatusCode());
        BehaviorRecordResponse firstBody = firstTap.getBody();
        assertNotNull(firstBody);
        assertEquals(session.getId(), firstBody.getSessionId());
        assertEquals(student.getId(), firstBody.getStudentId());
        assertEquals(listedTagId, firstBody.getTagId());
        // Nomes do aluno e da tag não vêm no payload: provam que a resposta foi montada a partir do banco
        assertEquals("Aluno E2E", firstBody.getStudentName());
        assertEquals("Atraso" + TAG_SUFFIX, firstBody.getTagName());
        assertBetween(beforeTap, afterTap, firstBody.getRecordedAt());

        // 3) Segundo toque na mesma tag: nova ocorrência, e não substituição
        ResponseEntity<BehaviorRecordResponse> secondTap =
                postRecord(tutor, new BehaviorRecordRequest(listedTagId, null), BehaviorRecordResponse.class);

        assertEquals(HttpStatus.CREATED, secondTap.getStatusCode());
        assertNotNull(secondTap.getBody());
        assertNotEquals(firstBody.getId(), secondTap.getBody().getId());

        // 4) Texto livre no perfil do mesmo aluno
        String text = "Trouxe uma referência nova que reorientou a discussão do grupo.";
        ResponseEntity<BehaviorRecordResponse> textRecord =
                postRecord(tutor, new BehaviorRecordRequest(null, text), BehaviorRecordResponse.class);

        assertEquals(HttpStatus.CREATED, textRecord.getStatusCode());
        assertNotNull(textRecord.getBody());
        assertEquals(text, textRecord.getBody().getText());
        assertNull(textRecord.getBody().getTagId());

        // 5) Estado do banco: três registros do aluno nesta sessão, com os ids devolvidos pela API
        List<BehaviorRecord> records = recordsOfStudentInSession();
        assertEquals(3, records.size());
        assertEquals(
                List.of(firstBody.getId(), secondTap.getBody().getId(), textRecord.getBody().getId()).stream().sorted().toList(),
                records.stream().map(BehaviorRecord::getId).sorted().toList());
        assertEquals(2, records.stream().filter(r -> r.getTag() != null && r.getTag().getId().equals(lateTagId)).count());
        BehaviorRecord firstPersisted = records.stream()
                .filter(r -> r.getId().equals(firstBody.getId()))
                .findFirst().orElseThrow();
        // O horário gravado é o do servidor, no intervalo do primeiro toque
        assertBetween(beforeTap, afterTap, firstPersisted.getRecordedAt());
        assertEquals(1, records.stream().filter(r -> r.getTag() == null && text.equals(r.getText())).count());
    }

    // --- JORNADA 2 (subtarefa de QA): texto livre acima do limite ---

    @Test
    @DisplayName("[E2E][US11][QA] Tutor envia um texto livre de 501 caracteres: 400 e nada gravado; reduzido a 500 caracteres, é aceito e gravado por inteiro")
    void qaJourney_SendTextOverLimitThenAtLimit() {
        // 1) Acima do limite: a API bloqueia a requisição
        ResponseEntity<String> overLimit = postRecord(
                tutor, new BehaviorRecordRequest(null, "x".repeat(501)), String.class);

        assertEquals(HttpStatus.BAD_REQUEST, overLimit.getStatusCode());
        assertNotNull(overLimit.getBody());
        // Lido como JSON, e não com contains: a mensagem precisa estar ligada ao campo text
        JsonNode error = objectMapper.readTree(overLimit.getBody());
        assertEquals("Validation failed", error.get("message").asString());
        assertEquals(TEXT_TOO_LONG_MESSAGE, error.get("errors").get("text").asString());
        // Contagem total: a requisição bloqueada não pode deixar rastro em nenhum perfil
        assertEquals(0, behaviorRecordRepository.count());

        // 2) O mesmo texto reduzido ao limite: aceito, provando que o bloqueio é só do excesso
        // O último caractere é distinto: um truncamento na coluna seria detectado
        String textAtLimit = "x".repeat(499) + "!";
        ResponseEntity<BehaviorRecordResponse> atLimit = postRecord(
                tutor, new BehaviorRecordRequest(null, textAtLimit), BehaviorRecordResponse.class);

        assertEquals(HttpStatus.CREATED, atLimit.getStatusCode());
        assertNotNull(atLimit.getBody());
        assertEquals(textAtLimit, atLimit.getBody().getText());

        List<BehaviorRecord> records = recordsOfStudentInSession();
        assertEquals(1, records.size());
        assertEquals(atLimit.getBody().getId(), records.get(0).getId());
        assertEquals(textAtLimit, records.get(0).getText());
    }

    // --- JORNADA 3: tutor de outra sala ---

    @Test
    @DisplayName("[E2E][US11] Tutor de outra sala recebe 403 ao registrar comportamento e nada é gravado")
    void securityJourney_TutorOfAnotherRoomCannotRegisterBehavior() {
        // O intruso também é tutor, mas de outra sala: a permissão precisa estar ligada a esta sala
        User intruder = persistUser("Tutor Intruso E2E");
        persistRoom("Sala do Intruso E2E", intruder);
        ResponseEntity<String> attempt = postRecord(
                intruder, new BehaviorRecordRequest(lateTagId, null), String.class);

        assertEquals(HttpStatus.FORBIDDEN, attempt.getStatusCode());
        // O 403 do GlobalExceptionHandler é texto puro, não JSON
        assertEquals(NOT_TUTOR_MESSAGE, attempt.getBody());
        assertEquals(0, behaviorRecordRepository.count());
    }

    // Helpers

    private <T> ResponseEntity<T> postRecord(User requester, BehaviorRecordRequest request, Class<T> responseType) {
        return restTemplate.exchange(
                url("/api/v1/sessions/" + session.getId() + "/students/" + student.getId() + "/behavior-records"),
                HttpMethod.POST,
                new HttpEntity<>(request, headersFor(requester)),
                responseType);
    }

    private void assertBetween(Instant before, Instant after, Instant actual) {
        assertNotNull(actual);
        // before é truncado em milissegundos porque o H2 guarda até microssegundos
        assertFalse(actual.isBefore(before), "horário " + actual + " anterior à requisição (" + before + ")");
        assertFalse(actual.isAfter(after), "horário " + actual + " posterior à resposta (" + after + ")");
    }

    // Leitura direta do banco, fora da transação do servidor
    private List<BehaviorRecord> recordsOfStudentInSession() {
        return behaviorRecordRepository.findAll().stream()
                .filter(r -> r.getSession().getId().equals(session.getId()))
                .filter(r -> r.getStudent().getId().equals(student.getId()))
                .toList();
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único entre testes
        user.setEmail("us11.e2e_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        user.setPassword("senha123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User roomTutor) {
        String code = "E11" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        Room room = new Room();
        room.setName(name);
        room.setAccessCode(code);
        room.setInviteLink("app/join/" + code);
        room.setTutor(roomTutor);
        return roomRepository.save(room);
    }

    // O aluno é membro ativo da sala, como na lista real da sessão
    private void persistStudentMember(Room room, User user) {
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(true);

        transactionTemplate.executeWithoutResult(status -> {
            entityManager.persist(member);
            entityManager.flush();
        });
    }

    private TutoringSession persistSession(Room room) {
        Problem problem = new Problem();
        problem.setTitle("Problema 1");
        problem.setRoom(room);
        problem.setCreatedAt(Instant.parse("2026-10-11T12:00:00Z"));
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);
        problem = problemRepository.save(problem);

        TutoringSession newSession = new TutoringSession();
        newSession.setProblem(problem);
        return tutoringSessionRepository.save(newSession);
    }

    private UUID persistTag(String name) {
        BehaviorTag tag = new BehaviorTag();
        tag.setName(name);
        UUID id = behaviorTagRepository.save(tag).getId();
        createdTagIds.add(id);
        return id;
    }
}
