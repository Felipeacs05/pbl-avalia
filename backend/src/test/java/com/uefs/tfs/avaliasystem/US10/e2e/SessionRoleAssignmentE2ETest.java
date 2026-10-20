package com.uefs.tfs.avaliasystem.US10.e2e;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentRequest;
import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentResponse;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
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
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

// NÍVEL: E2E. Servidor real em porta aleatória, HTTP real com TestRestTemplate e JWT real.
// Nenhuma camada é mockada; só o banco físico é trocado pelo H2.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestConfig
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
class SessionRoleAssignmentE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private SessionRoleAssignmentRepository sessionRoleAssignmentRepository;

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

    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode atribuir papéis da sessão.";
    private static final String ROLE_TAKEN_MESSAGE = "Este papel já foi atribuído a outro aluno nesta sessão.";

    private User tutor;
    private User student;
    private User otherStudent;
    private TutoringSession session;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);
        tutor = persistUser("Tutor E2E");
        student = persistUser("Aluno E2E");
        otherStudent = persistUser("Outro Aluno E2E");
        Room room = persistRoom("Sala dos Papéis E2E", tutor);
        persistStudentMember(room, student);
        persistStudentMember(room, otherStudent);
        session = persistSession(room);
    }

    // Sem @Transactional: o servidor atende em outra thread. Limpeza na ordem das FKs.
    @AfterEach
    void tearDown() {
        sessionRoleAssignmentRepository.deleteAll();
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

    // --- JORNADA 1 (subtarefa de QA): Secretário para dois alunos da mesma sessão ---

    @Test
    @DisplayName("[E2E][US10][QA] Tutor atribui Secretário de Quadro a um aluno e recebe 422 ao atribuí-lo a outro; só o primeiro fica gravado")
    void qaJourney_SameSecretaryRoleForTwoStudents_SecondIsRejected() {
        // 1) Secretário de Quadro para o 1º aluno: aceito
        ResponseEntity<SessionRoleAssignmentResponse> first =
                putRole(tutor, SessionRole.BOARD_SECRETARY, student, 0.5, SessionRoleAssignmentResponse.class);

        assertEquals(HttpStatus.CREATED, first.getStatusCode());
        SessionRoleAssignmentResponse firstBody = first.getBody();
        assertNotNull(firstBody);
        assertEquals(session.getId(), firstBody.getSessionId());
        assertEquals(student.getId(), firstBody.getStudentId());
        // O nome não vem no payload: prova que a resposta foi montada a partir do banco
        assertEquals("Aluno E2E", firstBody.getStudentName());
        assertEquals(SessionRole.BOARD_SECRETARY, firstBody.getRole());
        assertEquals(0.5, firstBody.getExtraGrade());
        assertEquals(firstBody.getId(), assignmentOf(student).getId());

        // 2) O mesmo papel para o 2º aluno: recusado, e o 1º continua sendo o único Secretário de Quadro
        ResponseEntity<String> second =
                putRole(tutor, SessionRole.BOARD_SECRETARY, otherStudent, 0.5, String.class);

        assertEquals(422, second.getStatusCode().value());
        assertNotNull(second.getBody());
        assertTrue(second.getBody().contains(ROLE_TAKEN_MESSAGE));
        assertEquals(Map.of(student.getId(), SessionRole.BOARD_SECRETARY), rolesInSession());

        // O registro do 1º aluno é o mesmo do passo 1: a recusa não apagou nem recriou nada
        assertEquals(firstBody.getId(), assignmentOf(student).getId());

        // 3) Secretário de Mesa é outro papel: o 2º aluno pode recebê-lo
        assertEquals(HttpStatus.CREATED,
                putRole(tutor, SessionRole.TABLE_SECRETARY, otherStudent, 0.5, String.class).getStatusCode());
        assertEquals(Map.of(
                student.getId(), SessionRole.BOARD_SECRETARY,
                otherStudent.getId(), SessionRole.TABLE_SECRETARY), rolesInSession());
    }

    // --- JORNADA 2 (IDOR): só o Tutor desta sala atribui papéis ---

    @Test
    @DisplayName("[E2E][US10] Tutor de outra sala recebe 403 ao atribuir um papel livre e os papéis da sessão não mudam")
    void idorJourney_TutorOfAnotherRoomCannotAssignRole() {
        // O intruso também é tutor, mas de outra sala: a permissão precisa estar ligada a esta sala
        User intruder = persistUser("Tutor Intruso E2E");
        persistRoom("Sala do Intruso E2E", intruder);

        assertEquals(HttpStatus.CREATED,
                putRole(tutor, SessionRole.COORDINATOR, student, 1.0, String.class).getStatusCode());

        // Papel e aluno livres: só a posse da sala pode barrar a atribuição
        ResponseEntity<String> attempt =
                putRole(intruder, SessionRole.TABLE_SECRETARY, otherStudent, 0.5, String.class);

        assertEquals(HttpStatus.FORBIDDEN, attempt.getStatusCode());
        // O 403 do GlobalExceptionHandler é texto puro, não JSON
        assertEquals(NOT_TUTOR_MESSAGE, attempt.getBody());
        assertEquals(Map.of(student.getId(), SessionRole.COORDINATOR), rolesInSession());
    }

    // Helpers

    private <T> ResponseEntity<T> putRole(User requester, SessionRole role, User target, double extraGrade,
                                          Class<T> responseType) {
        return restTemplate.exchange(
                url("/api/v1/sessions/" + session.getId() + "/roles/" + role.name()),
                HttpMethod.PUT,
                new HttpEntity<>(new SessionRoleAssignmentRequest(target.getId(), extraGrade), headersFor(requester)),
                responseType);
    }

    // Leitura direta do banco, fora da transação do servidor
    private SessionRoleAssignment assignmentOf(User target) {
        return sessionRoleAssignmentRepository.findBySessionIdAndStudentId(session.getId(), target.getId()).orElseThrow();
    }

    // Quem tem qual papel na sessão, relido do banco
    private Map<UUID, SessionRole> rolesInSession() {
        return sessionRoleAssignmentRepository.findAll().stream()
                .filter(a -> a.getSession().getId().equals(session.getId()))
                .collect(Collectors.toMap(a -> a.getStudent().getId(), SessionRoleAssignment::getRole));
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único entre testes
        user.setEmail("us10.e2e_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        user.setPassword("senha123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User roomTutor) {
        String code = "E10" + UUID.randomUUID().toString().substring(0, 3).toUpperCase();
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
