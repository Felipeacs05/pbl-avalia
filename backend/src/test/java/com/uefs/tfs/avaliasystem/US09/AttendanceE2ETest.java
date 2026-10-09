package com.uefs.tfs.avaliasystem.US09.e2e;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.AttendanceRequest;
import com.uefs.tfs.avaliasystem.dto.AttendanceResponse;
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

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
class AttendanceE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

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

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JwtService jwtService;

    private TransactionTemplate transactionTemplate;

    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode registrar a chamada.";

    private User tutor;
    private User student;
    private TutoringSession session;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);
        tutor = persistUser("Tutor E2E");
        student = persistUser("Aluno E2E");
        Room room = persistRoom("Sala da Chamada E2E", tutor);
        persistStudentMember(room, student);
        session = persistSession(room);
    }

    // Sem @Transactional: o servidor atende em outra thread. Limpeza na ordem das FKs.
    @AfterEach
    void tearDown() {
        attendanceRepository.deleteAll();
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

    // --- JORNADA 1: registro e alteração da presença pelo tutor ---

    @Test
    @DisplayName("[E2E][US09] Tutor registra a presença do aluno e depois altera o status; o servidor grava o horário de cada alteração")
    void attendanceJourney_RegisterThenChangeStatus_WorksEndToEnd() {
        // 1) Registro: Presente
        Instant beforeRegister = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        ResponseEntity<AttendanceResponse> registered = putAttendance(tutor, AttendanceStatus.PRESENT, AttendanceResponse.class);
        Instant afterRegister = Instant.now();

        assertEquals(HttpStatus.OK, registered.getStatusCode());
        AttendanceResponse registeredBody = registered.getBody();
        assertNotNull(registeredBody);
        assertEquals(session.getId(), registeredBody.getSessionId());
        assertEquals(student.getId(), registeredBody.getStudentId());
        // O nome não vem no payload: prova que a resposta foi montada a partir do banco
        assertEquals("Aluno E2E", registeredBody.getStudentName());
        assertEquals(AttendanceStatus.PRESENT, registeredBody.getStatus());
        assertBetween(beforeRegister, afterRegister, registeredBody.getRecordedAt());

        Attendance afterFirstRequest = persistedAttendance();
        assertEquals(registeredBody.getId(), afterFirstRequest.getId());
        assertEquals(AttendanceStatus.PRESENT, afterFirstRequest.getStatus());
        assertBetween(beforeRegister, afterRegister, afterFirstRequest.getRecordedAt());

        // 2) Alteração: Atraso
        Instant beforeChange = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        ResponseEntity<AttendanceResponse> changed = putAttendance(tutor, AttendanceStatus.LATE, AttendanceResponse.class);
        Instant afterChange = Instant.now();

        assertEquals(HttpStatus.OK, changed.getStatusCode());
        assertNotNull(changed.getBody());
        assertEquals(registeredBody.getId(), changed.getBody().getId());
        assertEquals(AttendanceStatus.LATE, changed.getBody().getStatus());
        assertBetween(beforeChange, afterChange, changed.getBody().getRecordedAt());

        // A mesma linha foi alterada, e não recriada
        assertEquals(1, recordsOfStudentInSession().size());
        Attendance afterSecondRequest = persistedAttendance();
        assertEquals(registeredBody.getId(), afterSecondRequest.getId());
        assertEquals(AttendanceStatus.LATE, afterSecondRequest.getStatus());
        assertBetween(beforeChange, afterChange, afterSecondRequest.getRecordedAt());
    }

    // --- JORNADA 2 (subtarefa de QA): reenvio após timeout ---

    @Test
    @DisplayName("[E2E][US09][QA] Registro com timeout no cliente seguido de reenvio mantém um único registro com o horário do primeiro envio")
    void qaJourney_TimeoutThenResend_KeepsSingleRecordAndFirstTimestamp() {
        // 1) Registro durante a lentidão da rede: o servidor grava, mas o cliente desiste e descarta a resposta
        ResponseEntity<String> lostResponse = putAttendance(tutor, AttendanceStatus.PRESENT, String.class);
        assertEquals(HttpStatus.OK, lostResponse.getStatusCode());
        Attendance first = persistedAttendance();

        // 2) Reenvio do mesmo status, após o aviso de timeout
        ResponseEntity<AttendanceResponse> resent = putAttendance(tutor, AttendanceStatus.PRESENT, AttendanceResponse.class);

        assertEquals(HttpStatus.OK, resent.getStatusCode());
        assertNotNull(resent.getBody());
        assertEquals(first.getId(), resent.getBody().getId());
        assertEquals(AttendanceStatus.PRESENT, resent.getBody().getStatus());
        // A tela recebe o horário do primeiro envio, que ela não chegou a ver
        assertEquals(first.getRecordedAt(), resent.getBody().getRecordedAt());

        // 3) Estado do banco: um único registro, com o horário real da presença
        assertEquals(1, recordsOfStudentInSession().size());
        Attendance persisted = persistedAttendance();
        assertEquals(first.getId(), persisted.getId());
        assertEquals(first.getRecordedAt(), persisted.getRecordedAt());
    }

    // --- JORNADA 3: tutor de outra sala ---

    @Test
    @DisplayName("[E2E][US09] Tutor de outra sala recebe 403 ao alterar a chamada e a presença registrada não muda")
    void securityJourney_TutorOfAnotherRoomCannotChangeAttendance() {
        // O intruso também é tutor, mas de outra sala: a permissão precisa estar ligada a esta sala
        User intruder = persistUser("Tutor Intruso E2E");
        persistRoom("Sala do Intruso E2E", intruder);

        ResponseEntity<AttendanceResponse> registered = putAttendance(tutor, AttendanceStatus.PRESENT, AttendanceResponse.class);
        assertEquals(HttpStatus.OK, registered.getStatusCode());
        Attendance original = persistedAttendance();

        ResponseEntity<String> attempt = putAttendance(intruder, AttendanceStatus.ABSENT, String.class);

        assertEquals(HttpStatus.FORBIDDEN, attempt.getStatusCode());
        // O 403 do GlobalExceptionHandler é texto puro, não JSON
        assertEquals(NOT_TUTOR_MESSAGE, attempt.getBody());

        assertEquals(1, recordsOfStudentInSession().size());
        Attendance persisted = persistedAttendance();
        assertEquals(original.getId(), persisted.getId());
        assertEquals(AttendanceStatus.PRESENT, persisted.getStatus());
        assertEquals(original.getRecordedAt(), persisted.getRecordedAt());
    }

    // Helpers

    private <T> ResponseEntity<T> putAttendance(User requester, AttendanceStatus status, Class<T> responseType) {
        return restTemplate.exchange(
                url("/api/v1/sessions/" + session.getId() + "/attendances/" + student.getId()),
                HttpMethod.PUT,
                new HttpEntity<>(new AttendanceRequest(status), headersFor(requester)),
                responseType);
    }

    private void assertBetween(Instant before, Instant after, Instant actual) {
        assertNotNull(actual);
        // before é truncado em milissegundos porque o H2 guarda até microssegundos
        assertFalse(actual.isBefore(before), "horário " + actual + " anterior à requisição (" + before + ")");
        assertFalse(actual.isAfter(after), "horário " + actual + " posterior à resposta (" + after + ")");
    }

    // Leitura direta do banco, fora da transação do servidor
    private Attendance persistedAttendance() {
        return attendanceRepository.findBySessionIdAndStudentId(session.getId(), student.getId()).orElseThrow();
    }

    private List<Attendance> recordsOfStudentInSession() {
        return attendanceRepository.findAll().stream()
                .filter(a -> a.getSession().getId().equals(session.getId()))
                .filter(a -> a.getStudent().getId().equals(student.getId()))
                .toList();
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único entre testes
        user.setEmail("us09.e2e_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        user.setPassword("senha123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User roomTutor) {
        String code = "E9" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
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
        problem.setCreatedAt(Instant.parse("2026-10-06T12:00:00Z"));
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);
        problem = problemRepository.save(problem);

        TutoringSession newSession = new TutoringSession();
        newSession.setProblem(problem);
        return tutoringSessionRepository.save(newSession);
    }
}
