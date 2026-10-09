package com.uefs.tfs.avaliasystem.US14;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste de Integração Real da US14 com H2:
 * - Valida a persistência em lote no banco de dados real
 * - Garante regra de isolamento: avaliar colega de equipe diferente é rejeitado com 403 e NÃO grava nada
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class PeerAssessmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

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

    @Autowired
    private EntityManager entityManager;

    private User persistUser(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword("password123");
        return userRepository.save(user);
    }

    private Room persistRoom(User tutor) {
        Room room = new Room();
        room.setName("Sala PBL US14");
        room.setAccessCode("US14-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(tutor);
        return roomRepository.save(room);
    }

    private Team persistTeam(String name, Room room) {
        Team team = new Team();
        team.setName(name);
        team.setRoom(room);
        return teamRepository.save(team);
    }

    private RoomMember persistMember(Room room, User user, Team team) {
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(user);
        member.setTeam(team);
        member.setRole(Role.STUDENT);
        member.setActive(true);
        return roomMemberRepository.save(member);
    }

    private Problem persistProblem(Room room, boolean peerReleased) {
        Problem problem = new Problem();
        problem.setTitle("Problema 3 - Avaliacao de Pares");
        problem.setRoom(room);
        problem.setSelfAssessmentReleased(false);
        problem.setPeerAssessmentReleased(peerReleased);
        problem.setCreatedAt(Instant.now());
        return problemRepository.save(problem);
    }

    @Nested
    @DisplayName("[US14] Cenários Válidos de Integração")
    class Validos {

        @Test
        @DisplayName("[US14] submitPeerAssessments_MesmoGrupo_GravaAvaliacoesNoH2")
        void submitPeerAssessments_MesmoGrupo_GravaAvaliacoesNoH2() throws Exception {
            User tutor = persistUser("Tutor US14", "tutor.us14." + UUID.randomUUID() + "@uefs.br");
            Room room = persistRoom(tutor);
            Team team = persistTeam("Grupo Alfa", room);

            User alunoAvaliador = persistUser("Avaliador", "alunoA." + UUID.randomUUID() + "@uefs.br");
            User alunoAlvo = persistUser("Colega de Grupo", "alunoB." + UUID.randomUUID() + "@uefs.br");

            persistMember(room, alunoAvaliador, team);
            persistMember(room, alunoAlvo, team);

            Problem problem = persistProblem(room, true);

            entityManager.flush();
            entityManager.clear();

            List<AssessmentRequest> requests = List.of(
                    new AssessmentRequest(alunoAlvo.getId(), 8.8, "Trabalhou muito bem no grupo")
            );

            mockMvc.perform(post("/api/v1/problems/{problemId}/peer-assessments", problem.getId())
                            .with(jwt().jwt(j -> j.subject(alunoAvaliador.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requests)))
                    .andExpect(status().isCreated());

            entityManager.flush();
            entityManager.clear();

            Optional<Assessment> saved = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(
                    problem.getId(), alunoAvaliador.getId(), alunoAlvo.getId()
            );
            assertThat(saved).isPresent();
            assertThat(saved.get().getScore()).isEqualTo(8.8);
        }
    }

    @Nested
    @DisplayName("[US14] Cenários Inválidos de Integração (Isolamento)")
    class Invalidos {

        @Test
        @DisplayName("[US14] submitPeerAssessments_GruposDiferentes_Retorna403ENaoGravaNoBanco")
        void submitPeerAssessments_GruposDiferentes_Retorna403ENaoGravaNoBanco() throws Exception {
            User tutor = persistUser("Tutor US14", "tutor.us14b." + UUID.randomUUID() + "@uefs.br");
            Room room = persistRoom(tutor);
            Team teamAlfa = persistTeam("Grupo Alfa", room);
            Team teamBeta = persistTeam("Grupo Beta", room);

            User alunoAlfa = persistUser("Aluno Alfa", "alfa." + UUID.randomUUID() + "@uefs.br");
            User alunoBeta = persistUser("Aluno Beta", "beta." + UUID.randomUUID() + "@uefs.br");

            persistMember(room, alunoAlfa, teamAlfa);
            persistMember(room, alunoBeta, teamBeta);

            Problem problem = persistProblem(room, true);

            entityManager.flush();
            entityManager.clear();

            List<AssessmentRequest> requests = List.of(
                    new AssessmentRequest(alunoBeta.getId(), 7.0, "Tentando avaliar colega do outro grupo")
            );

            mockMvc.perform(post("/api/v1/problems/{problemId}/peer-assessments", problem.getId())
                            .with(jwt().jwt(j -> j.subject(alunoAlfa.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requests)))
                    .andExpect(status().isForbidden());

            entityManager.flush();
            entityManager.clear();

            Optional<Assessment> saved = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(
                    problem.getId(), alunoAlfa.getId(), alunoBeta.getId()
            );
            assertThat(saved).isEmpty();
        }
    }
}
