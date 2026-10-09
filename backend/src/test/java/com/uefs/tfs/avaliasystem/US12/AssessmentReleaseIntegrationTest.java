package com.uefs.tfs.avaliasystem.US12;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste de Integração Real da US12 com Banco H2 em memória:
 * - Persiste entidades reais (User tutor, Room, Problem)
 * - Dispara MockMvc com JWT real
 * - Executa entityManager.flush() e clear() antes de reler o banco
 * - Comprova que nos cenários válidos a flag altera, e nos inválidos permanece inalterada
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class AssessmentReleaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private ProblemRepository problemRepository;

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
        room.setName("Sala PBL Teste US12");
        room.setAccessCode("PBL-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(tutor);
        return roomRepository.save(room);
    }

    private Problem persistProblem(Room room, boolean selfReleased, boolean peerReleased) {
        Problem problem = new Problem();
        problem.setTitle("Problema 1 - Avaliação");
        problem.setRoom(room);
        problem.setSelfAssessmentReleased(selfReleased);
        problem.setPeerAssessmentReleased(peerReleased);
        problem.setCreatedAt(Instant.now());
        return problemRepository.save(problem);
    }

    @Nested
    @DisplayName("[US12] Cenários Válidos de Integração")
    class Validos {

        @Test
        @DisplayName("[US12] alternarSelfAssessment_TutorAutenticado_AtualizaBancoH2")
        void alternarSelfAssessment_TutorAutenticado_AtualizaBancoH2() throws Exception {
            User tutor = persistUser("Tutor Responsavel", "tutor." + UUID.randomUUID() + "@uefs.br");
            Room room = persistRoom(tutor);
            Problem problem = persistProblem(room, false, false);

            entityManager.flush();
            entityManager.clear();

            mockMvc.perform(patch("/api/v1/problems/{problemId}/self-assessment-release", problem.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isOk());

            entityManager.flush();
            entityManager.clear();

            Problem atualizado = problemRepository.findById(problem.getId()).orElseThrow();
            assertThat(atualizado.getSelfAssessmentReleased()).isTrue();
        }

        @Test
        @DisplayName("[US12] alternarPeerAssessment_TutorAutenticado_AtualizaBancoH2")
        void alternarPeerAssessment_TutorAutenticado_AtualizaBancoH2() throws Exception {
            User tutor = persistUser("Tutor Responsavel", "tutor2." + UUID.randomUUID() + "@uefs.br");
            Room room = persistRoom(tutor);
            Problem problem = persistProblem(room, false, false);

            entityManager.flush();
            entityManager.clear();

            mockMvc.perform(patch("/api/v1/problems/{problemId}/peer-assessment-release", problem.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isOk());

            entityManager.flush();
            entityManager.clear();

            Problem atualizado = problemRepository.findById(problem.getId()).orElseThrow();
            assertThat(atualizado.getPeerAssessmentReleased()).isTrue();
        }
    }

    @Nested
    @DisplayName("[US12] Cenários Inválidos de Integração")
    class Invalidos {

        @Test
        @DisplayName("[US12] alternarSelfAssessment_UsuarioNaoTutor_Retorna403ENaoAlteraBanco")
        void alternarSelfAssessment_UsuarioNaoTutor_Retorna403ENaoAlteraBanco() throws Exception {
            User tutor = persistUser("Tutor Original", "tutor3." + UUID.randomUUID() + "@uefs.br");
            User intruso = persistUser("Aluno Intruso", "aluno." + UUID.randomUUID() + "@uefs.br");
            Room room = persistRoom(tutor);
            Problem problem = persistProblem(room, false, false);

            entityManager.flush();
            entityManager.clear();

            mockMvc.perform(patch("/api/v1/problems/{problemId}/self-assessment-release", problem.getId())
                            .with(jwt().jwt(j -> j.subject(intruso.getId().toString()))))
                    .andExpect(status().isForbidden());

            entityManager.flush();
            entityManager.clear();

            Problem problemInalterado = problemRepository.findById(problem.getId()).orElseThrow();
            assertThat(problemInalterado.getSelfAssessmentReleased()).isFalse();
        }
    }
}
