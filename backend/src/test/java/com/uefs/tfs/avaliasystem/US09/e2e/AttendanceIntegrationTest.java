package com.uefs.tfs.avaliasystem.US09;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.model.Attendance;
import com.uefs.tfs.avaliasystem.model.AttendanceStatus;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
@DisplayName("[US09] Integração de registro de chamada")
class AttendanceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private TutoringSessionRepository tutoringSessionRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    // Usado no flush/clear e para o vínculo RoomMember, como na US03
    @PersistenceContext
    private EntityManager entityManager;

    private static final String ROUTE = "/api/v1/sessions/{sessionId}/attendances/{studentId}";
    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode registrar a chamada.";

    // Horário antigo e fixo: permite distinguir o que já estava no banco do que a requisição gravou
    private final Instant OLD_RECORDED_AT = Instant.parse("2026-10-07T12:00:00Z");

    private User tutor;
    private User student;
    private TutoringSession session;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor Integração");
        student = persistUser("Aluno Integração");
        Room room = persistRoom("Sala da Chamada", tutor);
        persistStudentMember(room, student);
        session = persistSession(room);
        entityManager.flush();
        // Sem isto o Service recebe a entidade do cache; limpando, ele carrega do H2 como em produção
        entityManager.clear();
    }

    private RequestPostProcessor authenticatedAs(String userId) {
        return jwt().jwt(j -> j.subject(userId));
    }

    // --- PRIMEIRO REGISTRO ---

    @ParameterizedTest(name = "[{index}] status {0}")
    @EnumSource(AttendanceStatus.class)
    @DisplayName("Deve gravar o status pelas três camadas com o horário do servidor, ignorando um horário enviado pelo cliente")
    void registerAttendance_ThroughFullStack_PersistsStatusWithServerTimestamp(AttendanceStatus status) throws Exception {
        // O cliente tenta impor o horário: o campo não faz parte do contrato e precisa ser ignorado
        String body = "{\"status\":\"" + status.name() + "\",\"recordedAt\":\"2000-01-01T00:00:00Z\"}";

        // Truncado porque o H2 guarda até microssegundos: o valor relido nunca fica abaixo deste limite
        Instant before = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        String responseBody = putAttendance(tutor, body)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(session.getId().toString()))
                .andExpect(jsonPath("$.studentId").value(student.getId().toString()))
                // O nome não vem no payload: prova que a resposta foi montada a partir do banco
                .andExpect(jsonPath("$.studentName").value("Aluno Integração"))
                .andExpect(jsonPath("$.status").value(status.name()))
                .andReturn().getResponse().getContentAsString();
        Instant after = Instant.now();

        entityManager.flush();
        entityManager.clear();

        JsonNode json = objectMapper.readTree(responseBody);
        Attendance persisted = persistedAttendance();
        // O id devolvido é uma linha real do banco
        assertEquals(UUID.fromString(json.get("id").asString()), persisted.getId());
        assertEquals(status, persisted.getStatus());
        assertBetween(before, after, persisted.getRecordedAt());
        assertBetween(before, after, Instant.parse(json.get("recordedAt").asString()));
    }

    // --- ALTERAÇÃO DE STATUS ---

    @Test
    @DisplayName("Deve alterar o status na mesma linha e atualizar o horário para o instante da alteração")
    void registerAttendance_WhenRecordExists_UpdatesSameRowAndRefreshesTimestamp() throws Exception {
        UUID originalId = seedAttendance(AttendanceStatus.PRESENT).getId();

        Instant before = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        String responseBody = putAttendance(tutor, bodyWith(AttendanceStatus.LATE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(originalId.toString()))
                .andExpect(jsonPath("$.status").value("LATE"))
                .andReturn().getResponse().getContentAsString();
        Instant after = Instant.now();

        entityManager.flush();
        entityManager.clear();

        assertEquals(1, recordsOfStudentInSession().size());
        Attendance persisted = persistedAttendance();
        assertEquals(originalId, persisted.getId());
        assertEquals(AttendanceStatus.LATE, persisted.getStatus());
        assertBetween(before, after, persisted.getRecordedAt());
        // A tela recebe o horário novo, não o que estava no banco antes da alteração
        assertBetween(before, after, Instant.parse(objectMapper.readTree(responseBody).get("recordedAt").asString()));
    }

    @Test
    @DisplayName("[QA] Deve manter um único registro e o horário do primeiro envio quando o status é reenviado após um timeout")
    void registerAttendance_SameStatusResentAfterTimeout_KeepsSingleRecordAndFirstTimestamp() throws Exception {
        // 1º envio: o servidor grava, mas o cliente desiste por timeout e não recebe a resposta
        putAttendance(tutor, bodyWith(AttendanceStatus.PRESENT)).andExpect(status().isOk());
        entityManager.flush();
        entityManager.clear();
        Attendance first = persistedAttendance();
        entityManager.clear();

        // 2º envio: o retry do cliente com o mesmo status
        String responseBody = putAttendance(tutor, bodyWith(AttendanceStatus.PRESENT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(first.getId().toString()))
                .andExpect(jsonPath("$.status").value("PRESENT"))
                .andReturn().getResponse().getContentAsString();

        entityManager.flush();
        entityManager.clear();

        assertEquals(1, recordsOfStudentInSession().size());
        Attendance persisted = persistedAttendance();
        assertEquals(first.getId(), persisted.getId());
        assertEquals(first.getRecordedAt(), persisted.getRecordedAt());
        // A resposta do retry devolve o horário do primeiro envio, que a tela não chegou a receber
        assertEquals(first.getRecordedAt(), Instant.parse(objectMapper.readTree(responseBody).get("recordedAt").asString()));
    }

    // --- POSSE DA SALA ---

    @Test
    @DisplayName("Deve retornar 403 e não alterar o banco quando o usuário é tutor de outra sala")
    void registerAttendance_ByTutorOfAnotherRoom_Returns403_AndKeepsDatabaseIntact() throws Exception {
        // O intruso também é tutor, mas de outra sala: a permissão precisa estar ligada a esta sala
        User intruder = persistUser("Tutor Intruso");
        persistRoom("Sala do Intruso", intruder);
        UUID originalId = seedAttendance(AttendanceStatus.PRESENT).getId();

        putAttendance(intruder, bodyWith(AttendanceStatus.ABSENT))
                .andExpect(status().isForbidden())
                // O 403 do GlobalExceptionHandler é texto puro, não JSON
                .andExpect(content().string(NOT_TUTOR_MESSAGE));

        entityManager.flush();
        entityManager.clear();

        assertEquals(1, recordsOfStudentInSession().size());
        Attendance persisted = persistedAttendance();
        assertEquals(originalId, persisted.getId());
        assertEquals(AttendanceStatus.PRESENT, persisted.getStatus());
        assertEquals(OLD_RECORDED_AT, persisted.getRecordedAt());
    }

    // Helpers

    private ResultActions putAttendance(User requester, String body) throws Exception {
        return mockMvc.perform(put(ROUTE, session.getId(), student.getId())
                .with(authenticatedAs(requester.getId().toString()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String bodyWith(AttendanceStatus status) {
        return "{\"status\":\"" + status.name() + "\"}";
    }

    private void assertBetween(Instant before, Instant after, Instant actual) {
        assertNotNull(actual);
        assertFalse(actual.isBefore(before), "horário " + actual + " anterior à requisição (" + before + ")");
        assertFalse(actual.isAfter(after), "horário " + actual + " posterior à resposta (" + after + ")");
    }

    private Attendance persistedAttendance() {
        return attendanceRepository.findBySessionIdAndStudentId(session.getId(), student.getId()).orElseThrow();
    }

    private List<Attendance> recordsOfStudentInSession() {
        return attendanceRepository.findAll().stream()
                .filter(a -> a.getSession().getId().equals(session.getId()))
                .filter(a -> a.getStudent().getId().equals(student.getId()))
                .toList();
    }

    private Attendance seedAttendance(AttendanceStatus status) {
        Attendance attendance = new Attendance();
        attendance.setSession(tutoringSessionRepository.findById(session.getId()).orElseThrow());
        attendance.setStudent(userRepository.findById(student.getId()).orElseThrow());
        attendance.setStatus(status);
        attendance.setRecordedAt(OLD_RECORDED_AT);
        Attendance saved = attendanceRepository.save(attendance);
        entityManager.flush();
        entityManager.clear();
        return saved;
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único
        user.setEmail("us09." + UUID.randomUUID().toString().substring(0, 8) + "@avalia.edu");
        user.setPassword("senhaSegura123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User roomTutor) {
        String code = "C9" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
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
        problem.setCreatedAt(OLD_RECORDED_AT.minus(1, ChronoUnit.DAYS));
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);
        problem = problemRepository.save(problem);

        TutoringSession newSession = new TutoringSession();
        newSession.setProblem(problem);
        return tutoringSessionRepository.save(newSession);
    }
}
