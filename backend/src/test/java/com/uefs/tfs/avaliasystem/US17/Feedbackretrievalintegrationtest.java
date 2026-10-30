package com.uefs.tfs.avaliasystem.US17;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste de Integração Real da US17 com H2:
 * - Persiste entidades reais (tutor, alunos, sala, problema, feedback)
 * - Dispara MockMvc com JWT real, passando por Security (@PreAuthorize), Controller, Service e JPA
 * - Comprova o isolamento: aluno só lê o próprio feedback, tutor emissor também lê, terceiros recebem 403
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class FeedbackRetrievalIntegrationTest {

    private static final String URL = "/api/v1/students/{studentId}/feedbacks";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private ProblemRepository problemRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private EntityManager entityManager;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User tutor;
    private User studentA;
    private User studentB;

    @BeforeEach
    void setUp() {
        // Dado um tutor, dois alunos e um feedback emitido para o Aluno A
        tutor = persistUser("Prof. Ana Souza", "tutor.us17." + UUID.randomUUID() + "@uefs.br");
        studentA = persistUser("Aluno A", "alunoA.us17." + UUID.randomUUID() + "@uefs.br");
        studentB = persistUser("Aluno B", "alunoB.us17." + UUID.randomUUID() + "@uefs.br");

        Room room = persistRoom(tutor);
        Problem problem = persistProblem(room);
        persistFeedback(problem, studentA, 8.5, "Excelente participação nas sessões");

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
        room.setName("Sala PBL US17");
        room.setAccessCode("US17-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(roomTutor);
        return roomRepository.save(room);
    }

    private Problem persistProblem(Room room) {
        Problem problem = new Problem();
        problem.setTitle("Problema 6 - Visualização de Feedback");
        problem.setRoom(room);
        problem.setSelfAssessmentReleased(false);
        problem.setPeerAssessmentReleased(false);
        problem.setCreatedAt(Instant.now());
        return problemRepository.save(problem);
    }

    private Feedback persistFeedback(Problem problem, User student, double grade, String text) {
        Feedback feedback = new Feedback();
        feedback.setProblem(problem);
        feedback.setStudent(student);
        feedback.setGrade(grade);
        feedback.setText(text);
        return feedbackRepository.save(feedback);
    }

    @Nested
    @DisplayName("[US17] Cenários Válidos de Integração")
    class ValidScenarios {

        @Test
        @DisplayName("[US17] Aluno lê o próprio feedback e recebe 200 com o nome do tutor emissor")
        void getFeedbacks_OwnStudent_Returns200WithTutorName() throws Exception {
            // Quando o Aluno A busca os próprios feedbacks
            mockMvc.perform(get(URL, studentA.getId())
                            .with(jwt().jwt(j -> j.subject(studentA.getId().toString()))))
                    // Então recebe 200 com o nome do tutor, nota e texto
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1))
                    .andExpect(jsonPath("$.content[0].tutorName").value("Prof. Ana Souza"))
                    .andExpect(jsonPath("$.content[0].grade").value(8.5))
                    .andExpect(jsonPath("$.content[0].text").value("Excelente participação nas sessões"));
        }

        @Test
        @DisplayName("[US17] Aluno sem feedbacks recebe 200 com página vazia")
        void getFeedbacks_StudentWithoutFeedbacks_Returns200WithEmptyPage() throws Exception {
            // Quando o Aluno B, que não recebeu feedbacks, busca os seus
            mockMvc.perform(get(URL, studentB.getId())
                            .with(jwt().jwt(j -> j.subject(studentB.getId().toString()))))
                    // Então recebe 200 com a página vazia (sem 404/500)
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isEmpty())
                    .andExpect(jsonPath("$.totalElements").value(0));
        }

        @Test
        @DisplayName("[US17] Tutor emissor lê o feedback que criou e recebe 200")
        void getFeedbacks_IssuerTutor_Returns200() throws Exception {
            // Quando o tutor emissor busca os feedbacks do Aluno A
            mockMvc.perform(get(URL, studentA.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    // Então recebe 200 com o feedback que ele criou
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].tutorName").value("Prof. Ana Souza"));
        }
    }

    @Nested
    @DisplayName("[US17] Cenários Inválidos de Integração (Isolamento)")
    class InvalidScenarios {

        @Test
        @DisplayName("[US17] Aluno tentando ler feedback de outro aluno recebe 403")
        void getFeedbacks_OtherStudent_Returns403() throws Exception {
            // Quando o Aluno B tenta ler os feedbacks do Aluno A
            mockMvc.perform(get(URL, studentA.getId())
                            .with(jwt().jwt(j -> j.subject(studentB.getId().toString()))))
                    // Então o acesso é negado
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US17] Tutor que não emitiu feedback para o aluno recebe 403")
        void getFeedbacks_NonIssuerTutor_Returns403() throws Exception {
            // Dado um segundo tutor, dono de outra sala
            User otherTutor = persistUser("Prof. Outro", "outro.us17." + UUID.randomUUID() + "@uefs.br");
            persistRoom(otherTutor);
            entityManager.flush();
            entityManager.clear();

            // Quando ele tenta ler os feedbacks do Aluno A
            mockMvc.perform(get(URL, studentA.getId())
                            .with(jwt().jwt(j -> j.subject(otherTutor.getId().toString()))))
                    // Então o acesso é negado
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US17] Requisição sem token JWT retorna 401")
        void getFeedbacks_NoToken_Returns401() throws Exception {
            // Quando a requisição chega sem autenticação
            mockMvc.perform(get(URL, studentA.getId()))
                    // Então é barrada antes de qualquer regra de negócio
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("[US17] Prevenção de Vazamento de Dados (Integração)")
    class DataLeakPrevention {

        @Test
        @DisplayName("[US17] Resposta real não vaza IDs internos, e-mail do tutor nem senha")
        void getFeedbacks_Response_DoesNotLeakSensitiveData() throws Exception {
            // Quando o aluno busca o próprio feedback
            String body = mockMvc.perform(get(URL, studentA.getId())
                            .with(jwt().jwt(j -> j.subject(studentA.getId().toString()))))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

            // Então o corpo não contém o e-mail do tutor, a senha nem os IDs do banco
            assertThat(body)
                    .doesNotContain(tutor.getEmail())
                    .doesNotContain("password123")
                    .doesNotContain(tutor.getId().toString())
                    .doesNotContain(studentA.getId().toString());

            // E as chaves do item são exatamente o contrato público
            JsonNode item = objectMapper.readTree(body).get("content").get(0);
            Set<String> keys = new HashSet<>();
            item.fieldNames().forEachRemaining(keys::add);
            assertThat(keys).containsExactlyInAnyOrder("tutorName", "problemTitle", "grade", "text", "createdAt");
        }
    }
}