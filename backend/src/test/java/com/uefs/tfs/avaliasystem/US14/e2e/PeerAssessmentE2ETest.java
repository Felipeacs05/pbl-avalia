package com.uefs.tfs.avaliasystem.US14.e2e;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.*;
import com.uefs.tfs.avaliasystem.service.JwtService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.context.SpringBootTest.WebEnvironment.RANDOM_PORT;

/**
 * E2E de API Completo (Ponta a Ponta) para US14:
 * - Servidor real em RANDOM_PORT com TestRestTemplate
 * - Geração de JWT real via JwtService
 * - Jornada completa: Tutor abre avaliação, Aluno A avalia Aluno B (mesmo grupo),
 *   Aluno A tenta avaliar Aluno C de outro grupo e recebe 403 Forbidden.
 * - Cleanup no @AfterEach respeitando integridade referencial de FKs.
 */
@TestConfig
@SpringBootTest(webEnvironment = RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class PeerAssessmentE2ETest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private RoomMemberRepository roomMemberRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private AssessmentRepository assessmentRepository;

    private User tutor;
    private User alunoA;
    private User alunoB;
    private User alunoC;
    private Room room;
    private Team teamAlfa;
    private Team teamBeta;
    private Problem problem;

    @BeforeEach
    void setUp() {
        tutor = userRepository.save(new User("Tutor E2E", "tutor.e2e." + UUID.randomUUID() + "@uefs.br", "pass", null));
        alunoA = userRepository.save(new User("Aluno A", "alunoA.e2e." + UUID.randomUUID() + "@uefs.br", "pass", null));
        alunoB = userRepository.save(new User("Aluno B", "alunoB.e2e." + UUID.randomUUID() + "@uefs.br", "pass", null));
        alunoC = userRepository.save(new User("Aluno C", "alunoC.e2e." + UUID.randomUUID() + "@uefs.br", "pass", null));

        room = new Room();
        room.setName("Sala E2E US14");
        room.setAccessCode("E2E-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(tutor);
        room = roomRepository.save(room);

        teamAlfa = new Team();
        teamAlfa.setName("Time Alfa");
        teamAlfa.setRoom(room);
        teamAlfa = teamRepository.save(teamAlfa);

        teamBeta = new Team();
        teamBeta.setName("Time Beta");
        teamBeta.setRoom(room);
        teamBeta = teamRepository.save(teamBeta);

        // Alunos A e B no Time Alfa
        persistMember(room, alunoA, teamAlfa);
        persistMember(room, alunoB, teamAlfa);

        // Aluno C no Time Beta
        persistMember(room, alunoC, teamBeta);

        problem = new Problem();
        problem.setTitle("Problema E2E US14");
        problem.setRoom(room);
        problem.setSelfAssessmentReleased(false);
        problem.setPeerAssessmentReleased(false);
        problem.setCreatedAt(Instant.now());
        problem = problemRepository.save(problem);
    }

    private void persistMember(Room r, User u, Team t) {
        RoomMember rm = new RoomMember();
        rm.setRoom(r);
        rm.setUser(u);
        rm.setTeam(t);
        rm.setRole(Role.STUDENT);
        rm.setActive(true);
        roomMemberRepository.save(rm);
    }

    @AfterEach
    void cleanUp() {
        assessmentRepository.deleteAll();
        roomMemberRepository.deleteAll();
        teamRepository.deleteAll();
        problemRepository.deleteAll();
        roomRepository.deleteAll();
        userRepository.deleteAll();
    }

    private HttpHeaders authHeaders(UUID userId) {
        String token = jwtService.generateToken(userId);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    @Test
    @DisplayName("[US14] e2e_JornadaCompleta_TutorLibera_AlunoAvaliaColega_EBloqueiaOutroGrupo")
    void e2e_JornadaCompleta_TutorLibera_AlunoAvaliaColega_EBloqueiaOutroGrupo() {
        // 1. Aluno A tenta avaliar antes da liberacao do tutor -> 403 Forbidden
        List<AssessmentRequest> payloadAlunoB = List.of(new AssessmentRequest(alunoB.getId(), 9.0, "Parceiro"));
        HttpEntity<List<AssessmentRequest>> requestFechado = new HttpEntity<>(payloadAlunoB, authHeaders(alunoA.getId()));

        ResponseEntity<Void> respFechado = restTemplate.postForEntity(
                "/api/v1/problems/" + problem.getId() + "/peer-assessments",
                requestFechado,
                Void.class
        );
        assertThat(respFechado.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // 2. Tutor libera a avaliacao de pares via PATCH -> 200 OK
        HttpEntity<Void> requestTutor = new HttpEntity<>(authHeaders(tutor.getId()));
        ResponseEntity<Void> respTutor = restTemplate.exchange(
                "/api/v1/problems/" + problem.getId() + "/peer-assessment-release",
                HttpMethod.PATCH,
                requestTutor,
                Void.class
        );
        assertThat(respTutor.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 3. Aluno A avalia Aluno B (mesmo Time Alfa) -> 201 Created
        HttpEntity<List<AssessmentRequest>> requestSucesso = new HttpEntity<>(payloadAlunoB, authHeaders(alunoA.getId()));
        ResponseEntity<Void> respSucesso = restTemplate.postForEntity(
                "/api/v1/problems/" + problem.getId() + "/peer-assessments",
                requestSucesso,
                Void.class
        );
        assertThat(respSucesso.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // 4. Aluno A tenta avaliar Aluno C (Time Beta de outro grupo) -> 403 Forbidden (Isolamento)
        List<AssessmentRequest> payloadAlunoC = List.of(new AssessmentRequest(alunoC.getId(), 7.0, "Colega de outro grupo"));
        HttpEntity<List<AssessmentRequest>> requestInvasao = new HttpEntity<>(payloadAlunoC, authHeaders(alunoA.getId()));

        ResponseEntity<Void> respInvasao = restTemplate.postForEntity(
                "/api/v1/problems/" + problem.getId() + "/peer-assessments",
                requestInvasao,
                Void.class
        );
        assertThat(respInvasao.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
