package com.uefs.tfs.avaliasystem.US05.e2e;

import com.uefs.tfs.avaliasystem.US03.e2e.TestAuthenticationConfig;
import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.dto.ProblemResponse;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

// LEVEL: E2E (top of the pyramid - few, slow, expensive tests).
// Unlike ProblemIntegrationTest (MockMvc, still inside the test JVM), a real Servlet server is
// started on a random port and called over real HTTP with TestRestTemplate, exactly as an external
// client would. No layer is mocked; only the physical database is replaced by in-memory H2.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
@Import(TestAuthenticationConfig.class)
class ProblemE2ETest {

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

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

    private TransactionTemplate transactionTemplate;

    private User tutor;
    private Room room;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);
        tutor = persistUser("E2E Tutor");
        room = persistRoom("E2E-PRB", "E2E Problems Room");

        // Configura o MockitoBean do JwtDecoder para decodificar dinamicamente qualquer token
        // extraindo o userId recebido e mapeando no claim 'sub' do JWT.
        Mockito.when(jwtDecoder.decode(anyString())).thenAnswer(invocation -> {
            String token = invocation.getArgument(0);
            return Jwt.withTokenValue(token)
                    .header("alg", "none")
                    .claim("sub", token) // Usa o próprio valor do token como userId/sub
                    .build();
        });
    }

    // No @Transactional here: the real server handles the request in another thread,
    // so a test transaction would not cover the HTTP call. Cleanup follows the FK order.
    @AfterEach
    void tearDown() {
        problemRepository.deleteAll();
        transactionTemplate.executeWithoutResult(status ->
                entityManager.createQuery("DELETE FROM RoomMember").executeUpdate());
        roomRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpEntity<Object> authenticatedRequest(Object body, String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);
        headers.setBearerAuth(userId); // Injeta o cabeçalho Authorization: Bearer <userId>
        return new HttpEntity<>(body, headers);
    }

    // --- JOURNEY 1: the room Tutor creates, edits and deletes a problem ---

    @Test
    @DisplayName("[E2E][US05] Room Tutor creates, edits and deletes a problem end to end")
    void tutorLifecycle_CreateUpdateDeleteProblem_WorksEndToEnd() {
        // 1) Creation
        ResponseEntity<ProblemResponse> createResponse = restTemplate.postForEntity(
                url("/api/v1/rooms/" + room.getId() + "/problems"),
                authenticatedRequest(new ProblemRequest("Problem 1"), tutor.getId().toString()),
                ProblemResponse.class);

        assertEquals(HttpStatus.CREATED, createResponse.getStatusCode());
        assertNotNull(createResponse.getBody());
        UUID problemId = createResponse.getBody().getId();
        assertEquals("Problem 1", createResponse.getBody().getTitle());

        Problem created = problemRepository.findById(problemId).orElseThrow();
        assertEquals(room.getId(), created.getRoom().getId());

        // 2) Update
        ResponseEntity<ProblemResponse> updateResponse = restTemplate.exchange(
                url("/api/v1/problems/" + problemId),
                HttpMethod.PUT,
                authenticatedRequest(new ProblemRequest("Problem 1 - Revised"), tutor.getId().toString()),
                ProblemResponse.class);

        assertEquals(HttpStatus.OK, updateResponse.getStatusCode());
        assertNotNull(updateResponse.getBody());
        assertEquals("Problem 1 - Revised", updateResponse.getBody().getTitle());
        assertEquals("Problem 1 - Revised", problemRepository.findById(problemId).orElseThrow().getTitle());

        // 3) Deletion
        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                url("/api/v1/problems/" + problemId),
                HttpMethod.DELETE,
                authenticatedRequest(null, tutor.getId().toString()),
                Void.class);

        assertEquals(HttpStatus.NO_CONTENT, deleteResponse.getStatusCode());
        assertTrue(problemRepository.findById(problemId).isEmpty());
    }

    // --- JOURNEY 2 (IDOR): only the Tutor of this specific room can create, edit or delete ---

    @Test
    @DisplayName("[E2E][US05] Tutor of another room cannot create, edit or delete problems of this room")
    void idorJourney_TutorOfAnotherRoomCannotManageProblems() {
        Problem problem = persistProblem(room, "Protected Problem", Instant.parse("2026-03-01T10:00:00Z"));
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("E2E Intruder Tutor");
        persistRoom("E2E-INT", "Intruder Own Room", intruder);

        ResponseEntity<String> createAttempt = restTemplate.postForEntity(
                url("/api/v1/rooms/" + room.getId() + "/problems"),
                authenticatedRequest(new ProblemRequest("Intruder Problem"), intruder.getId().toString()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, createAttempt.getStatusCode());

        ResponseEntity<String> updateAttempt = restTemplate.exchange(
                url("/api/v1/problems/" + problem.getId()),
                HttpMethod.PUT,
                authenticatedRequest(new ProblemRequest("Hijacked Title"), intruder.getId().toString()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, updateAttempt.getStatusCode());

        ResponseEntity<String> deleteAttempt = restTemplate.exchange(
                url("/api/v1/problems/" + problem.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, intruder.getId().toString()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, deleteAttempt.getStatusCode());

        // Nothing changed in the database: no new problem, original title kept, row still there
        List<Problem> roomProblems = problemRepository.findAllByRoomIdOrderByCreatedAtAsc(room.getId());
        assertEquals(1, roomProblems.size());
        assertEquals("Protected Problem", roomProblems.get(0).getTitle());
    }

    // --- JOURNEY 3 (QA subtask): an active student member of the room cannot create, edit or delete ---

    @Test
    @DisplayName("[E2E][US05] Active student member of the room gets 403 on create, edit and delete; nothing changes")
    void qaJourney_ActiveStudentMemberCannotManageProblems() {
        Problem problem = persistProblem(room, "Protected Problem", Instant.parse("2026-03-01T10:00:00Z"));
        // Belonging to the room is not enough: only its Tutor can create, edit or delete problems
        User student = persistUser("E2E Member Student");
        persistMember(room, student, true, null);

        ResponseEntity<String> createAttempt = restTemplate.postForEntity(
                url("/api/v1/rooms/" + room.getId() + "/problems"),
                authenticatedRequest(new ProblemRequest("Student Problem"), student.getId().toString()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, createAttempt.getStatusCode());

        ResponseEntity<String> updateAttempt = restTemplate.exchange(
                url("/api/v1/problems/" + problem.getId()),
                HttpMethod.PUT,
                authenticatedRequest(new ProblemRequest("Hijacked Title"), student.getId().toString()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, updateAttempt.getStatusCode());

        ResponseEntity<String> deleteAttempt = restTemplate.exchange(
                url("/api/v1/problems/" + problem.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, student.getId().toString()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, deleteAttempt.getStatusCode());

        // Nothing changed in the database: no new problem, original title kept, row still there
        List<Problem> roomProblems = problemRepository.findAllByRoomIdOrderByCreatedAtAsc(room.getId());
        assertEquals(1, roomProblems.size());
        assertEquals("Protected Problem", roomProblems.get(0).getTitle());
    }

    // --- JOURNEY 4: the listing follows the semester chronology ---

    @Test
    @DisplayName("[E2E][US05] Listing returns only the room problems, in chronological order")
    void listingJourney_ReturnsRoomProblemsInChronologicalOrder() {
        Instant base = Instant.parse("2026-03-01T10:00:00Z");

        // Inserted out of order on purpose: the order must come from createdAt, not insertion
        persistProblem(room, "Problem 3", base.plus(2, ChronoUnit.DAYS));
        persistProblem(room, "Problem 1", base);
        persistProblem(room, "Problem 2", base.plus(1, ChronoUnit.DAYS));

        Room otherRoom = persistRoom("E2E-OTH", "Other Room");
        persistProblem(otherRoom, "Other Room Problem", base.minus(1, ChronoUnit.DAYS));

        ResponseEntity<ProblemResponse[]> response = restTemplate.exchange(
                url("/api/v1/rooms/" + room.getId() + "/problems"),
                HttpMethod.GET,
                authenticatedRequest(null, tutor.getId().toString()),
                ProblemResponse[].class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(List.of("Problem 1", "Problem 2", "Problem 3"),
                Arrays.stream(response.getBody()).map(ProblemResponse::getTitle).toList());
    }

    // Helpers

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        user.setEmail(name.toLowerCase().replaceAll("\\s+", "") + "_" + UUID.randomUUID().toString().substring(0, 5) + "@example.com");
        user.setPassword("password123");
        return userRepository.save(user);
    }

    private Room persistRoom(String code, String name) {
        return persistRoom(code, name, tutor);
    }

    private Room persistRoom(String code, String name, User owner) {
        Room newRoom = new Room();
        newRoom.setName(name);
        newRoom.setAccessCode(code);
        newRoom.setInviteLink("app/join/" + code);
        newRoom.setTutor(owner);
        return roomRepository.save(newRoom);
    }

    private Problem persistProblem(Room targetRoom, String title, Instant createdAt) {
        Problem problem = new Problem();
        problem.setTitle(title);
        problem.setRoom(targetRoom);
        problem.setCreatedAt(createdAt != null ? createdAt : Instant.now());
        return problemRepository.save(problem);
    }

    private void persistMember(Room targetRoom, User user, boolean active, Instant unlinkedAt) {
        RoomMember member = new RoomMember();
        member.setRoom(targetRoom);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        member.setUnlinkedAt(unlinkedAt);

        transactionTemplate.executeWithoutResult(status -> {
            entityManager.persist(member);
            entityManager.flush();
        });
    }
}