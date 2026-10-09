package com.uefs.tfs.avaliasystem.US13;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste de Integração Real da US13 com H2:
 * - Garante que autoavaliação só grava no banco quando a flag selfAssessmentReleased == true
 * - Comprova que tentativas com período fechado retornam 403 e NÃO gravam nada no banco
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class SelfAssessmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

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
        room.setName("Sala PBL US13");
        room.setAccessCode("US13-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(tutor);
        return roomRepository.save(room);
    }

    private Problem persistProblem(Room room, boolean selfReleased) {
        Problem problem = new Problem();
        problem.setTitle("Problema 2 - Autoavaliacao");
        problem.setRoom(room);
        problem.setSelfAssessmentReleased(selfReleased);
        problem.setPeerAssessmentReleased(false);
        problem.setCreatedAt(Instant.now());
        return problemRepository.save(problem);
    }

    @Nested
    @DisplayName("[US13] Cenários Válidos de Integração")
    class Validos {

        @Test
        @DisplayName("[US13] submitSelfAssessment_PeriodoLiberado_GravaNoBancoH2")
        void submitSelfAssessment_PeriodoLiberado_GravaNoBancoH2() throws Exception {
            User tutor = persistUser("Tutor US13", "tutor.us13." + UUID.randomUUID() + "@uefs.br");
            User aluno = persistUser("Aluno US13", "aluno.us13." + UUID.randomUUID() + "@uefs.br");
            Room room = persistRoom(tutor);
            Problem problem = persistProblem(room, true);

            entityManager.flush();
            entityManager.clear();

            AssessmentRequest request = new AssessmentRequest(null, 9.5, "Desempenho excelente no PBL");

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problem.getId())
                            .with(jwt().jwt(j -> j.subject(aluno.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            entityManager.flush();
            entityManager.clear();

            Optional<Assessment> saved = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(
                    problem.getId(), aluno.getId(), aluno.getId()
            );

            assertThat(saved).isPresent();
            assertThat(saved.get().getScore()).isEqualTo(9.5);
            assertThat(saved.get().getComment()).isEqualTo("Desempenho excelente no PBL");
        }
    }

    @Nested
    @DisplayName("[US13] Cenários Inválidos de Integração")
    class Invalidos {

        @Test
        @DisplayName("[US13] submitSelfAssessment_PeriodoFechado_Retorna403ENaoGravaNoBanco")
        void submitSelfAssessment_PeriodoFechado_Retorna403ENaoGravaNoBanco() throws Exception {
            User tutor = persistUser("Tutor US13", "tutor.us13b." + UUID.randomUUID() + "@uefs.br");
            User aluno = persistUser("Aluno US13", "aluno.us13b." + UUID.randomUUID() + "@uefs.br");
            Room room = persistRoom(tutor);
            Problem problem = persistProblem(room, false);

            entityManager.flush();
            entityManager.clear();

            AssessmentRequest request = new AssessmentRequest(null, 8.0, "Tentativa com periodo fechado");

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problem.getId())
                            .with(jwt().jwt(j -> j.subject(aluno.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());

            entityManager.flush();
            entityManager.clear();

            Optional<Assessment> saved = assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(
                    problem.getId(), aluno.getId(), aluno.getId()
            );
            assertThat(saved).isEmpty();
        }
    }
}
