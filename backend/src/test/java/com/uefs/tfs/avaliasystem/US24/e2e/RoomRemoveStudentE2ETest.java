package com.uefs.tfs.avaliasystem.US24.e2e;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.*;
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
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

/**
 * Contrato assumido:
 * - Nível: END-TO-END COM SERVIDOR REAL (RANDOM_PORT + TestRestTemplate)
 * - SEM @Transactional (servidor roda em outra thread).
 * - Jornadas cobertas:
 *   1. Tutor remove aluno -> 204; aluno tenta acessar /members -> 401 sem token / sem vínculo ativo.
 *   2. IDOR: tutor de outra sala -> 403 e banco inalterado.
 *   3. Aluno comum -> 403 e banco inalterado.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestConfig
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
@DisplayName("[US24] Testes E2E — Remoção de Aluno (TestRestTemplate / Servidor Real)")
class RoomRemoveStudentE2ETest {

    @LocalServerPort
    private int port;

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private RoomMemberRepository roomMemberRepository;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PlatformTransactionManager transactionManager;

    private TransactionTemplate tx;

    private User tutor;
    private User student;
    private User intruder;
    private User studentComum;
    private Room room;
    private Room otherRoom;
    private RoomMember studentMember;

    @BeforeEach
    void setUp() {
        tx = new TransactionTemplate(transactionManager);

        tx.executeWithoutResult(status -> {
            tutor       = persistUser("Tutor E2E US24");
            student     = persistUser("Aluno E2E US24");
            intruder    = persistUser("Intruso E2E US24");
            studentComum = persistUser("Aluno Comum E2E US24");

            room      = persistRoom("Sala E2E US24", tutor);
            otherRoom = persistRoom("Outra Sala E2E US24", intruder);

            studentMember = persistMember(room, student, Role.STUDENT, true);
            persistMember(otherRoom, studentComum, Role.STUDENT, true);
        });
    }

    @AfterEach
    void tearDown() {
        tx.executeWithoutResult(status -> {
            roomMemberRepository.deleteAll();
            roomRepository.deleteAll();
            userRepository.deleteAll();
        });
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpHeaders authHeaders(User user) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(jwtService.generateToken(user.getId(), user.getTokenVersion()));
        return h;
    }

    // ─────────────── JORNADA 1: REMOÇÃO COMPLETA ───────────────

    @Test
    @DisplayName("[E2E][US24] Jornada 1: Tutor remove aluno -> 204; aluno perde acesso ao endpoint de membros")
    void journey_TutorRemovesStudent_StudentLosesRoomAccess() {
        // 1. Tutor remove o aluno
        ResponseEntity<Void> removeResponse = restTemplate.exchange(
                url("/api/v1/rooms/" + room.getId() + "/members/" + student.getId()),
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(tutor)),
                Void.class
        );
        assertEquals(HttpStatus.NO_CONTENT, removeResponse.getStatusCode(),
                "DELETE deve retornar 204 No Content");

        // 2. Verifica banco: vínculo inativo
        tx.executeWithoutResult(status -> {
            RoomMember updated = roomMemberRepository
                    .findByRoomIdAndUserId(room.getId(), student.getId()).orElseThrow();
            assertFalse(updated.isActive(), "O vínculo deve estar inativo no banco");
            assertNotNull(updated.getUnlinkedAt(), "unlinkedAt deve estar preenchido");
        });

        // 3. Aluno tenta listar membros da sala -> 403 (sem vínculo ativo)
        ResponseEntity<String> membersResponse = restTemplate.exchange(
                url("/api/v1/rooms/" + room.getId() + "/members"),
                HttpMethod.GET,
                new HttpEntity<>(authHeaders(student)),
                String.class
        );
        assertEquals(HttpStatus.FORBIDDEN, membersResponse.getStatusCode(),
                "Aluno removido não deve ter acesso à lista de membros (403)");
    }

    // ─────────────── JORNADA 2: IDOR — TUTOR DE OUTRA SALA ───────────────

    @Test
    @DisplayName("[E2E][US24] Jornada 2 IDOR: Tutor de outra sala tenta remover aluno -> 403 e banco inalterado")
    void journey_IntruderTutorRemovesStudent_Returns403AndDatabaseUnchanged() {
        // Act — intruso (tutor de outra sala) tenta remover
        ResponseEntity<String> response = restTemplate.exchange(
                url("/api/v1/rooms/" + room.getId() + "/members/" + student.getId()),
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(intruder)),
                String.class
        );
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode(),
                "Tutor de outra sala deve receber 403 Forbidden");

        // Verifica banco: vínculo continua ativo
        tx.executeWithoutResult(status -> {
            RoomMember member = roomMemberRepository
                    .findByRoomIdAndUserId(room.getId(), student.getId()).orElseThrow();
            assertTrue(member.isActive(),
                    "O vínculo deve continuar ATIVO após tentativa de remoção não autorizada");
            assertNull(member.getUnlinkedAt(),
                    "unlinkedAt não deve ser preenchido após tentativa negada");
        });
    }

    // ─────────────── JORNADA 3: ALUNO COMUM ───────────────

    @Test
    @DisplayName("[E2E][US24] Jornada 3: Aluno comum tentando remover outro aluno -> 403 e banco inalterado")
    void journey_CommonStudentRemovesAnotherStudent_Returns403AndDatabaseUnchanged() {
        // Act — aluno comum tenta remover outro aluno
        ResponseEntity<String> response = restTemplate.exchange(
                url("/api/v1/rooms/" + room.getId() + "/members/" + student.getId()),
                HttpMethod.DELETE,
                new HttpEntity<>(authHeaders(studentComum)),
                String.class
        );
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode(),
                "Aluno comum deve receber 403 Forbidden ao tentar remover outro aluno");

        // Verifica banco
        tx.executeWithoutResult(status -> {
            assertTrue(
                    roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), student.getId()),
                    "O vínculo do aluno alvo deve continuar ativo"
            );
        });
    }

    // ─────────────── HELPERS ───────────────

    private User persistUser(String name) {
        User u = new User();
        u.setName(name);
        u.setEmail(name.toLowerCase().replace(" ", ".") + "." + UUID.randomUUID().toString().substring(0, 8) + "@uefs.br");
        u.setPassword(passwordEncoder.encode("Senha@123"));
        u.setTokenVersion(1);
        return userRepository.save(u);
    }

    private Room persistRoom(String name, User roomTutor) {
        Room r = new Room();
        r.setName(name);
        r.setAccessCode(UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        r.setTutor(roomTutor);
        return roomRepository.save(r);
    }

    private RoomMember persistMember(Room r, User u, Role role, boolean active) {
        RoomMember rm = new RoomMember();
        rm.setRoom(r);
        rm.setUser(u);
        rm.setRole(role);
        rm.setActive(active);
        rm.setUnlinkedAt(null);
        return roomMemberRepository.save(rm);
    }
}
