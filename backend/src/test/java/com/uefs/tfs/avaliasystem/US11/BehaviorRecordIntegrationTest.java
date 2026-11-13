package com.uefs.tfs.avaliasystem.US11;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.BehaviorRecordRequest;
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
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// NÍVEL: INTEGRAÇÃO. Sobe o contexto inteiro: Controller, Service e Repository reais com H2 via MockMvc.
// O Clock é o bean real (ClockConfig): o horário é conferido entre os instantes antes e depois da requisição.
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("[US11] Integração de registro de comportamento")
class BehaviorRecordIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    // Usado no flush/clear e para o vínculo RoomMember, como na US09
    @PersistenceContext
    private EntityManager entityManager;

    private static final String TAGS_ROUTE = "/api/v1/rooms/{roomId}/behavior-tags";
    private static final String RECORDS_ROUTE = "/api/v1/sessions/{sessionId}/students/{studentId}/behavior-records";
    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode registrar comportamentos.";
    private static final String TEXT_TOO_LONG_MESSAGE = "O texto deve ter no máximo 500 caracteres.";

    private static final String TAG_SUFFIX = " US11";

    private User tutor;
    private User student;
    private Room room;
    private TutoringSession session;
    private BehaviorTag lateTag;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor Integração");
        student = persistUser("Aluno Integração");
        room = persistRoom("Sala do Comportamento", tutor);
        persistStudentMember(room, student);
        session = persistSession(room);
        // Inseridas fora de ordem de propósito: a ordem da listagem precisa vir do banco
        persistTag(room, "Celular fora de contexto" + TAG_SUFFIX);
        lateTag = persistTag(room, "Atraso" + TAG_SUFFIX);
        entityManager.flush();
        // Sem isto o Service recebe a entidade do cache; limpando, ele carrega do H2 como em produção
        entityManager.clear();
    }

    private RequestPostProcessor authenticatedAs(String userId) {
        return jwt().jwt(j -> j.subject(userId));
    }

    // --- REGISTRO POR TAG ---

    @Test
    @DisplayName("Deve registrar o comportamento com uma tag obtida da listagem, gravando-o pelas três camadas com o horário do servidor")
    void createBehaviorRecord_WithTagFromListing_PersistsThroughFullStack() throws Exception {
        // 1º toque do fluxo: a tela recebe as tags do banco, em ordem alfabética
        String tagsBody = mockMvc.perform(get(TAGS_ROUTE, room.getId())
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<JsonNode> tags = tagsCreatedHere(objectMapper.readTree(tagsBody));
        assertEquals(List.of("Atraso" + TAG_SUFFIX, "Celular fora de contexto" + TAG_SUFFIX),
                tags.stream().map(t -> t.get("name").asString()).toList());
        UUID listedTagId = UUID.fromString(tags.get(0).get("id").asString());
        assertEquals(lateTag.getId(), listedTagId);

        // 2º toque: o id listado é enviado como está, sem nenhuma etapa intermediária
        // Truncado porque o H2 guarda até microssegundos: o valor relido nunca fica abaixo deste limite
        Instant before = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        String responseBody = postRecord(tutor, new BehaviorRecordRequest(listedTagId, null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").value(session.getId().toString()))
                .andExpect(jsonPath("$.studentId").value(student.getId().toString()))
                .andExpect(jsonPath("$.tagId").value(listedTagId.toString()))
                // Nomes do aluno e da tag não vêm no payload: provam que a resposta foi montada a partir do banco
                .andExpect(jsonPath("$.studentName").value("Aluno Integração"))
                .andExpect(jsonPath("$.tagName").value("Atraso" + TAG_SUFFIX))
                .andReturn().getResponse().getContentAsString();
        Instant after = Instant.now();

        entityManager.flush();
        entityManager.clear();

        JsonNode json = objectMapper.readTree(responseBody);
        List<BehaviorRecord> records = recordsOfStudentInSession();
        assertEquals(1, records.size());
        BehaviorRecord persisted = records.get(0);
        // O id devolvido é uma linha real do banco
        assertEquals(UUID.fromString(json.get("id").asString()), persisted.getId());
        assertEquals(lateTag.getId(), persisted.getTag().getId());
        assertNull(persisted.getText());
        assertBetween(before, after, persisted.getRecordedAt());
        assertBetween(before, after, Instant.parse(json.get("recordedAt").asString()));
    }

    @Test
    @DisplayName("Deve acumular um registro por toque quando a mesma tag é aplicada duas vezes ao aluno na sessão")
    void createBehaviorRecord_SameTagTwice_PersistsTwoRecords() throws Exception {
        BehaviorRecordRequest request = new BehaviorRecordRequest(lateTag.getId(), null);

        String firstId = idFrom(postRecord(tutor, request).andExpect(status().isCreated()));
        entityManager.flush();
        entityManager.clear();
        String secondId = idFrom(postRecord(tutor, request).andExpect(status().isCreated()));

        entityManager.flush();
        entityManager.clear();

        // Diferente da chamada da US09: o segundo toque não substitui o primeiro
        assertNotEquals(firstId, secondId);
        List<BehaviorRecord> records = recordsOfStudentInSession();
        assertEquals(2, records.size());
        assertTrue(records.stream().allMatch(r -> r.getTag().getId().equals(lateTag.getId())));
    }

    // --- REGISTRO POR TEXTO LIVRE ---

    @Test
    @DisplayName("Deve gravar o texto livre sem tag no perfil do aluno")
    void createBehaviorRecord_WithTextOnly_PersistsTextWithoutTag() throws Exception {
        String text = "Interrompeu o colega duas vezes durante a discussão.";

        postRecord(tutor, new BehaviorRecordRequest(null, text))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value(text))
                .andExpect(jsonPath("$.studentName").value("Aluno Integração"));

        entityManager.flush();
        entityManager.clear();

        List<BehaviorRecord> records = recordsOfStudentInSession();
        assertEquals(1, records.size());
        assertEquals(text, records.get(0).getText());
        assertNull(records.get(0).getTag());
    }

    // --- LIMITE DO TEXTO LIVRE ---

    @Test
    @DisplayName("[QA] Deve gravar por inteiro um texto livre com exatamente 500 caracteres")
    void createBehaviorRecord_WithTextAtLimit_PersistsWholeText() throws Exception {
        // O último caractere é distinto: um truncamento na coluna seria detectado
        String textAtLimit = "x".repeat(499) + "!";

        postRecord(tutor, new BehaviorRecordRequest(null, textAtLimit))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value(textAtLimit));

        entityManager.flush();
        entityManager.clear();

        List<BehaviorRecord> records = recordsOfStudentInSession();
        assertEquals(1, records.size());
        assertEquals(textAtLimit, records.get(0).getText());
    }

    @Test
    @DisplayName("[QA] Deve bloquear com 400 e não gravar nada quando o texto livre passa de 500 caracteres")
    void createBehaviorRecord_WithTextOverLimit_Returns400_AndPersistsNothing() throws Exception {
        String textOverLimit = "x".repeat(501);

        postRecord(tutor, new BehaviorRecordRequest(null, textOverLimit))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.text").value(TEXT_TOO_LONG_MESSAGE));

        entityManager.flush();
        entityManager.clear();

        // Contagem total, e não só do aluno: a requisição recusada não pode deixar rastro em nenhum perfil
        assertEquals(0, behaviorRecordRepository.count());
    }

    // --- POSSE DA SALA ---

    @Test
    @DisplayName("Deve retornar 403 e não gravar nada quando o usuário é tutor de outra sala")
    void createBehaviorRecord_ByTutorOfAnotherRoom_Returns403_AndPersistsNothing() throws Exception {
        // O intruso também é tutor, mas de outra sala: a permissão precisa estar ligada a esta sala
        User intruder = persistUser("Tutor Intruso");
        persistRoom("Sala do Intruso", intruder);
        entityManager.flush();
        entityManager.clear();

        postRecord(intruder, new BehaviorRecordRequest(lateTag.getId(), null))
                .andExpect(status().isForbidden())
                // O 403 do GlobalExceptionHandler é texto puro, não JSON
                .andExpect(content().string(NOT_TUTOR_MESSAGE));

        entityManager.flush();
        entityManager.clear();

        // Contagem total, e não só do aluno: a requisição recusada não pode deixar rastro em nenhum perfil
        assertEquals(0, behaviorRecordRepository.count());
    }

    // Helpers

    private ResultActions postRecord(User requester, BehaviorRecordRequest request) throws Exception {
        return mockMvc.perform(post(RECORDS_ROUTE, session.getId(), student.getId())
                .with(authenticatedAs(requester.getId().toString()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    private String idFrom(ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString()).get("id").asString();
    }

    // Preserva a ordem devolvida pela API, descartando tags que não foram criadas por este teste
    private List<JsonNode> tagsCreatedHere(JsonNode tags) {
        List<JsonNode> created = new ArrayList<>();
        for (int i = 0; i < tags.size(); i++) {
            JsonNode tag = tags.get(i);
            if (tag.get("name").asString().endsWith(TAG_SUFFIX)) {
                created.add(tag);
            }
        }
        return created;
    }

    private List<BehaviorRecord> recordsOfStudentInSession() {
        return behaviorRecordRepository.findAll().stream()
                .filter(r -> r.getSession().getId().equals(session.getId()))
                .filter(r -> r.getStudent().getId().equals(student.getId()))
                .toList();
    }

    private void assertBetween(Instant before, Instant after, Instant actual) {
        assertNotNull(actual);
        assertFalse(actual.isBefore(before), "horário " + actual + " anterior à requisição (" + before + ")");
        assertFalse(actual.isAfter(after), "horário " + actual + " posterior à resposta (" + after + ")");
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único
        user.setEmail("us11." + UUID.randomUUID().toString().substring(0, 8) + "@avalia.edu");
        user.setPassword("senhaSegura123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User roomTutor) {
        String code = "C11" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
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
        entityManager.persist(member);
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

    private BehaviorTag persistTag(Room room, String name) {
        BehaviorTag tag = new BehaviorTag();
        tag.setRoom(room);
        tag.setName(name);
        return behaviorTagRepository.save(tag);
    }
}
