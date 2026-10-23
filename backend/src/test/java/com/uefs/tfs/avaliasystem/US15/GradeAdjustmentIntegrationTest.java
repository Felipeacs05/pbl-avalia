package com.uefs.tfs.avaliasystem.US15;

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
import org.junit.jupiter.api.BeforeEach;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste de Integração Real da US15 com H2:
 * - Persiste entidades reais (tutor, aluno, sala, problema, autoavaliação)
 * - Dispara MockMvc com JWT real, passando por Security, Controller, Service e JPA
 * - Relê o banco após flush()/clear() para comprovar a auditoria (original, ajustada, justificativa)
 * - Comprova que aluno, payload inválido, ausência de token e avaliação inexistente são barrados sem alterar o banco
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class GradeAdjustmentIntegrationTest {

    private static final String URL = "/api/v1/assessments/{assessmentId}/grade-adjustment";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private ProblemRepository problemRepository;
    @Autowired private AssessmentRepository assessmentRepository;
    @Autowired private EntityManager entityManager;

    private User tutor;
    private User student;
    private Assessment selfAssessment;

    @BeforeEach
    void setUp() {
        // Dado um tutor, um aluno e uma autoavaliação de nota 6.0 já enviada pelo aluno
        tutor = persistUser("Tutor US15", "tutor.us15." + UUID.randomUUID() + "@uefs.br");
        student = persistUser("Aluno US15", "aluno.us15." + UUID.randomUUID() + "@uefs.br");
        Room room = persistRoom(tutor);
        Problem problem = persistProblem(room);
        selfAssessment = persistSelfAssessment(problem, student, 6.0);

        entityManager.flush();
        entityManager.clear();
    }

    private User persistUser(String name, String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword("password123");
        return userRepository.save(user);
    }

    private Room persistRoom(User roomTutor) {
        Room room = new Room();
        room.setName("Sala PBL US15");
        room.setAccessCode("US15-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(roomTutor);
        return roomRepository.save(room);
    }

    private Problem persistProblem(Room room) {
        Problem problem = new Problem();
        problem.setTitle("Problema 4 - Moderação de Notas");
        problem.setRoom(room);
        problem.setSelfAssessmentReleased(true);
        problem.setPeerAssessmentReleased(false);
        problem.setCreatedAt(Instant.now());
        return problemRepository.save(problem);
    }

    private Assessment persistSelfAssessment(Problem problem, User author, double score) {
        Assessment assessment = new Assessment();
        assessment.setProblem(problem);
        assessment.setEvaluator(author);
        assessment.setTarget(author);
        assessment.setScore(score);
        assessment.setComment("Participei ativamente das sessões");
        return assessmentRepository.save(assessment);
    }

    @Nested
    @DisplayName("[US15] Cenários Válidos de Integração")
    class ValidScenarios {

        @Test
        @DisplayName("[US15] Tutor ajusta a nota com justificativa e o banco guarda original, ajustada e justificativa")
        void adjustGrade_TutorWithJustification_SavesOriginalAdjustedAndJustificationToH2() throws Exception {
            // Quando o tutor da sala ajusta a nota de 6.0 para 8.0 com justificativa
            mockMvc.perform(patch(URL, selfAssessment.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.0, "justification": "Nota subestimada frente ao desempenho"}
                                    """))
                    // Então a API devolve 200 com a flag de modificação
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.modifiedByTutor").value(true))
                    .andExpect(jsonPath("$.originalGrade").value(6.0))
                    .andExpect(jsonPath("$.adjustedGrade").value(8.0));

            entityManager.flush();
            entityManager.clear();

            // E o banco preserva a nota original e guarda a ajustada e a justificativa
            Assessment saved = assessmentRepository.findById(selfAssessment.getId()).orElseThrow();
            assertThat(saved.getOriginalGrade()).as("Nota original preservada").isEqualTo(6.0);
            assertThat(saved.getAdjustedGrade()).as("Nota ajustada gravada").isEqualTo(8.0);
            assertThat(saved.getScore()).as("Nota efetiva (score) reflete o ajuste do tutor").isEqualTo(8.0);
            assertThat(saved.getJustification()).isEqualTo("Nota subestimada frente ao desempenho");
            assertThat(saved.getModifiedByTutor()).isTrue();
        }

        @Test
        @DisplayName("[US15] Dois ajustes consecutivos mantêm a nota original enviada pelo aluno")
        void adjustGrade_TwoAdjustments_KeepsStudentOriginalGrade() throws Exception {
            // Dado que o tutor já ajustou a nota uma vez
            mockMvc.perform(patch(URL, selfAssessment.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.0, "justification": "Primeiro ajuste"}
                                    """))
                    .andExpect(status().isOk());

            // Quando ele ajusta novamente
            mockMvc.perform(patch(URL, selfAssessment.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 7.0, "justification": "Segundo ajuste"}
                                    """))
                    .andExpect(status().isOk());

            entityManager.flush();
            entityManager.clear();

            // Então a nota original continua sendo a do envio do aluno
            Assessment saved = assessmentRepository.findById(selfAssessment.getId()).orElseThrow();
            assertThat(saved.getOriginalGrade()).isEqualTo(6.0);
            assertThat(saved.getAdjustedGrade()).isEqualTo(7.0);
            assertThat(saved.getJustification()).isEqualTo("Segundo ajuste");
        }
    }

    @Nested
    @DisplayName("[US15] Cenários Inválidos de Integração")
    class InvalidScenarios {

        @Test
        @DisplayName("[US15] Aluno tentando alterar a nota recebe 403 e o banco permanece intacto")
        void adjustGrade_StudentProfile_Returns403AndDoesNotUpdateDatabase() throws Exception {
            // Quando o aluno tenta alterar a própria nota
            mockMvc.perform(patch(URL, selfAssessment.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 10.0, "justification": "Quero nota máxima"}
                                    """))
                    // Então a operação é barrada com 403
                    .andExpect(status().isForbidden());

            entityManager.flush();
            entityManager.clear();

            // E o banco permanece intacto
            Assessment unchanged = assessmentRepository.findById(selfAssessment.getId()).orElseThrow();
            assertThat(unchanged.getScore()).isEqualTo(6.0);
            assertThat(unchanged.getAdjustedGrade()).isNull();
            assertThat(unchanged.getJustification()).isNull();
            assertThat(unchanged.getModifiedByTutor()).isFalse();
        }

        @Test
        @DisplayName("[US15] Ajuste sem justificativa retorna 400 e o banco permanece intacto")
        void adjustGrade_WithoutJustification_Returns400AndDoesNotUpdateDatabase() throws Exception {
            // Quando o tutor envia o ajuste sem justificativa
            mockMvc.perform(patch(URL, selfAssessment.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.0, "justification": ""}
                                    """))
                    // Então a API responde 400
                    .andExpect(status().isBadRequest());

            entityManager.flush();
            entityManager.clear();

            // E nada é gravado
            Assessment unchanged = assessmentRepository.findById(selfAssessment.getId()).orElseThrow();
            assertThat(unchanged.getScore()).isEqualTo(6.0);
            assertThat(unchanged.getOriginalGrade()).isNull();
            assertThat(unchanged.getModifiedByTutor()).isFalse();
        }

        @Test
        @DisplayName("[US15] Requisição sem token JWT retorna 401 antes de qualquer regra de negócio")
        void adjustGrade_NoToken_Returns401() throws Exception {
            // Quando a requisição chega sem autenticação
            mockMvc.perform(patch(URL, selfAssessment.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.0, "justification": "Justificativa"}
                                    """))
                    // Então é barrada antes de qualquer lógica de negócio
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("[US15] Avaliação inexistente retorna 404")
        void adjustGrade_NonExistentAssessment_Returns404() throws Exception {
            // Quando o tutor tenta ajustar um ID que não existe no banco
            mockMvc.perform(patch(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.0, "justification": "Justificativa"}
                                    """))
                    // Então a API responde 404
                    .andExpect(status().isNotFound());
        }
    }
}