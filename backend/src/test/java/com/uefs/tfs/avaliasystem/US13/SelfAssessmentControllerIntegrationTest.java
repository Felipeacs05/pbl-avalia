package com.uefs.tfs.avaliasystem.US13;

import com.uefs.tfs.avaliasystem.TestConfig;
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
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
 * Teste de integração (Spring Boot + MockMvc + H2) da US13:
 * garante que a submissão de autoavaliação é BLOQUEADA quando a flag
 * selfAssessmentReleased (release) está em false.
 *
 * Cobertura:
 * - release=false  -> 403 Forbidden e nada é gravado no banco
 * - release=false com avaliação anterior -> 403 e a nota antiga permanece intacta
 * - release reaberto e fechado novamente -> volta a bloquear
 * - sem token JWT -> 401 Unauthorized
 * - release=true (controle positivo) -> 201 Created, provando que o bloqueio vem da flag
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class SelfAssessmentControllerIntegrationTest {

    private static final String SELF_ASSESSMENT_URL = "/api/v1/problems/{problemId}/self-assessment";

    @Autowired
    private MockMvc mockMvc;

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

    private User persistUser(String name, String emailPrefix) {
        User user = new User();
        user.setName(name);
        user.setEmail(emailPrefix + "." + UUID.randomUUID() + "@uefs.br");
        user.setPassword("password123");
        return userRepository.save(user);
    }

    private Room persistRoom(User tutor) {
        Room room = new Room();
        room.setName("Sala PBL US13 Release");
        room.setAccessCode("REL-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(tutor);
        return roomRepository.save(room);
    }

    private Problem persistProblem(Room room, boolean released) {
        Problem problem = new Problem();
        problem.setTitle("Problema - Release da Autoavaliação");
        problem.setRoom(room);
        problem.setSelfAssessmentReleased(released);
        problem.setPeerAssessmentReleased(false);
        problem.setCreatedAt(Instant.now());
        return problemRepository.save(problem);
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    private String payload(double score, String comment) {
        return """
                {"score": %s, "comment": "%s"}
                """.formatted(score, comment);
    }

    @Nested
    @DisplayName("[US13] Bloqueio quando release=false")
    class ReleaseClosedScenarios {

        @Test
        @DisplayName("[US13] submit_ReleaseFalse_Retorna403ENaoGravaNoBanco")
        void submit_ReleaseFalse_Returns403AndDoesNotSave() throws Exception {
            // Dado um problema com a autoavaliação fechada (release=false)
            User tutor = persistUser("Tutor Release", "tutor.rel");
            User student = persistUser("Aluno Release", "aluno.rel");
            Problem problem = persistProblem(persistRoom(tutor), false);
            flushAndClear();

            // Quando o aluno tenta submeter a autoavaliação
            mockMvc.perform(post(SELF_ASSESSMENT_URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload(8.0, "Tentativa com release fechado")))
                    // Então a API bloqueia a requisição
                    .andExpect(status().isForbidden());

            flushAndClear();

            // E nenhuma avaliação é persistida
            Optional<Assessment> saved = assessmentRepository
                    .findByProblemIdAndEvaluatorIdAndTargetId(problem.getId(), student.getId(), student.getId());
            assertThat(saved)
                    .as("Nenhuma autoavaliação deveria ser gravada quando release=false")
                    .isEmpty();
        }

        @Test
        @DisplayName("[US13] submit_ReleaseFalseComAvaliacaoPrevia_Retorna403EPreservaNotaOriginal")
        void submit_ReleaseFalseWithPreviousAssessment_Returns403AndKeepsOriginalScore() throws Exception {
            // Dado uma autoavaliação já registrada enquanto o período estava aberto
            User tutor = persistUser("Tutor Release", "tutor.rel2");
            User student = persistUser("Aluno Release", "aluno.rel2");
            Problem problem = persistProblem(persistRoom(tutor), true);
            flushAndClear();

            mockMvc.perform(post(SELF_ASSESSMENT_URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload(5.0, "Nota original")))
                    .andExpect(status().isCreated());
            flushAndClear();

            // E o tutor fecha o período (release=false)
            Problem reloaded = problemRepository.findById(problem.getId()).orElseThrow();
            reloaded.setSelfAssessmentReleased(false);
            problemRepository.save(reloaded);
            flushAndClear();

            // Quando o aluno tenta sobrescrever a nota
            mockMvc.perform(post(SELF_ASSESSMENT_URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload(9.5, "Tentativa de sobrescrever")))
                    // Então a API bloqueia
                    .andExpect(status().isForbidden());

            flushAndClear();

            // E a nota e o comentário originais permanecem intactos
            Assessment kept = assessmentRepository
                    .findByProblemIdAndEvaluatorIdAndTargetId(problem.getId(), student.getId(), student.getId())
                    .orElseThrow();
            assertThat(kept.getScore())
                    .as("A nota original deveria ser preservada após a tentativa bloqueada")
                    .isEqualTo(5.0);
            assertThat(kept.getComment())
                    .as("O comentário original deveria ser preservado após a tentativa bloqueada")
                    .isEqualTo("Nota original");
        }

        @Test
        @DisplayName("[US13] submit_ReleaseReabertoEFechadoNovamente_VoltaABloquear")
        void submit_ReleaseReopenedAndClosedAgain_BlocksAgain() throws Exception {
            // Dado um problema que já foi aberto e fechado novamente
            User tutor = persistUser("Tutor Release", "tutor.rel3");
            User student = persistUser("Aluno Release", "aluno.rel3");
            Problem problem = persistProblem(persistRoom(tutor), true);
            problem.setSelfAssessmentReleased(false);
            problemRepository.save(problem);
            flushAndClear();

            // Quando o aluno tenta submeter
            mockMvc.perform(post(SELF_ASSESSMENT_URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload(7.0, "Depois de fechar")))
                    // Então continua bloqueado
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US13] submit_SemToken_Retorna401")
        void submit_WithoutToken_Returns401() throws Exception {
            // Dado um problema com release=false e uma requisição sem JWT
            User tutor = persistUser("Tutor Release", "tutor.rel4");
            Problem problem = persistProblem(persistRoom(tutor), false);
            flushAndClear();

            // Quando a requisição chega sem autenticação
            mockMvc.perform(post(SELF_ASSESSMENT_URL, problem.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload(8.0, "Sem token")))
                    // Então a segurança barra antes de chegar ao serviço
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("[US13] Controle positivo (release=true)")
    class ReleaseOpenScenarios {

        @Test
        @DisplayName("[US13] submit_ReleaseTrue_Retorna201EGravaNoBanco")
        void submit_ReleaseTrue_Returns201AndSaves() throws Exception {
            // Dado um problema com a autoavaliação liberada
            User tutor = persistUser("Tutor Release", "tutor.rel5");
            User student = persistUser("Aluno Release", "aluno.rel5");
            Problem problem = persistProblem(persistRoom(tutor), true);
            flushAndClear();

            // Quando o aluno submete a autoavaliação
            mockMvc.perform(post(SELF_ASSESSMENT_URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload(8.0, "Período liberado")))
                    // Então a API aceita
                    .andExpect(status().isCreated());

            flushAndClear();

            // E a avaliação é persistida (prova que o bloqueio anterior vem da flag)
            Optional<Assessment> saved = assessmentRepository
                    .findByProblemIdAndEvaluatorIdAndTargetId(problem.getId(), student.getId(), student.getId());
            assertThat(saved)
                    .as("A autoavaliação deveria ser gravada quando release=true")
                    .isPresent();
            assertThat(saved.get().getScore()).isEqualTo(8.0);
        }
    }
}