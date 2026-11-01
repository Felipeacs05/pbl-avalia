package com.uefs.tfs.avaliasystem.US16;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
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

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTimeout;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste de Integração Real da US16 com H2:
 * - Persiste entidades reais (tutor, alunos, sala, membros, problema)
 * - Dispara MockMvc com JWT real, passando por Security, Controller, Service e JPA
 * - Envio individual: relê o banco após flush()/clear() para confirmar a persistência
 * - Envio em lote: 40 alunos devem ser processados em menos de 2 segundos (assertTimeout)
 * - Cenários inválidos (400, 403, 404) não gravam nada no banco
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class FeedbackIntegrationTest {

    private static final String URL = "/api/v1/problems/{problemId}/feedbacks";
    private static final String BATCH_URL = "/api/v1/problems/{problemId}/feedbacks/batch";
    private static final int CLASS_SIZE = 40;
    private static final Duration BATCH_TIME_LIMIT = Duration.ofSeconds(2);

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private RoomMemberRepository roomMemberRepository;
    @Autowired private ProblemRepository problemRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private EntityManager entityManager;

    private User tutor;
    private Room room;
    private Problem problem;

    @BeforeEach
    void setUp() {
        // Dado um tutor, uma sala e um problema dessa sala
        tutor = persistUser("Tutor US16", "tutor.us16." + UUID.randomUUID() + "@uefs.br");
        room = persistRoom(tutor);
        problem = persistProblem(room);
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
        Room r = new Room();
        r.setName("Sala PBL US16");
        r.setAccessCode("US16-" + UUID.randomUUID().toString().substring(0, 6));
        r.setTutor(roomTutor);
        return roomRepository.save(r);
    }

    private Problem persistProblem(Room r) {
        Problem p = new Problem();
        p.setTitle("Problema 5 - Devolutiva");
        p.setRoom(r);
        p.setSelfAssessmentReleased(false);
        p.setPeerAssessmentReleased(false);
        p.setCreatedAt(Instant.now());
        return problemRepository.save(p);
    }

    /** Cria um aluno ativo vinculado à sala do teste. */
    private User persistStudentInRoom(String prefix) {
        User student = persistUser(prefix, prefix + "." + UUID.randomUUID() + "@uefs.br");
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(student);
        member.setRole(Role.STUDENT);
        member.setActive(true);
        roomMemberRepository.save(member);
        return student;
    }

    private String feedbackJson(UUID studentId, double grade, String text) {
        return """
                {"studentId": "%s", "grade": %s, "text": "%s"}""".formatted(studentId, grade, text);
    }

    @Nested
    @DisplayName("[US16] Cenários Válidos de Integração")
    class ValidScenarios {

        @Test
        @DisplayName("[US16] Envio individual pela API persiste nota e texto no banco")
        void sendFeedback_ValidPayload_PersistsToH2Database() throws Exception {
            // Dado um aluno ativo da sala
            User student = persistStudentInRoom("Aluno Individual");
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor envia o feedback individual
            mockMvc.perform(post(URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(feedbackJson(student.getId(), 8.5, "Excelente participação nas sessões")))
                    // Então a API responde 201 com os dados salvos
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.grade").value(8.5))
                    .andExpect(jsonPath("$.studentId").value(student.getId().toString()));

            entityManager.flush();
            entityManager.clear();

            // E o banco contém exatamente um feedback com nota e texto
            List<Feedback> saved = feedbackRepository.findByProblemId(problem.getId());
            assertThat(saved).hasSize(1);
            assertThat(saved.get(0).getGrade()).isEqualTo(8.5);
            assertThat(saved.get(0).getText()).isEqualTo("Excelente participação nas sessões");
            assertThat(saved.get(0).getStudent().getId()).isEqualTo(student.getId());
        }

        @Test
        @DisplayName("[US16] Envio em lote para 40 alunos conclui em menos de 2 segundos e persiste todos")
        void sendBatchFeedback_WholeClass_CompletesWithinTimeLimitAndPersistsAll() throws Exception {
            // Dado uma turma de 40 alunos ativos e o payload do lote
            List<User> students = new ArrayList<>();
            for (int i = 0; i < CLASS_SIZE; i++) {
                students.add(persistStudentInRoom("Aluno" + i));
            }
            entityManager.flush();
            entityManager.clear();

            String payload = students.stream()
                    .map(s -> feedbackJson(s.getId(), 8.0, "Bom desempenho no ciclo"))
                    .collect(Collectors.joining(",", "{\"feedbacks\": [", "]}"));

            // Quando o tutor dispara o lote, a requisição inteira deve terminar abaixo do limite
            assertTimeout(BATCH_TIME_LIMIT, () -> {
                mockMvc.perform(post(BATCH_URL, problem.getId())
                                .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                        // Então a API responde 201 com um item por aluno
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.length()").value(CLASS_SIZE));
            });

            entityManager.flush();
            entityManager.clear();

            // E o banco contém um feedback para cada aluno da turma
            List<Feedback> saved = feedbackRepository.findByProblemId(problem.getId());
            assertThat(saved).hasSize(CLASS_SIZE);
            assertThat(saved).extracting(f -> f.getStudent().getId())
                    .containsExactlyInAnyOrderElementsOf(students.stream().map(User::getId).toList());
            assertThat(saved).allSatisfy(f -> assertThat(f.getGrade()).isEqualTo(8.0));
        }
    }

    @Nested
    @DisplayName("[US16] Cenários Inválidos de Integração")
    class InvalidScenarios {

        @Test
        @DisplayName("[US16] Envio individual com nota nula retorna 400 e nada é gravado")
        void sendFeedback_NullGrade_Returns400AndDoesNotPersist() throws Exception {
            // Dado um aluno ativo da sala
            User student = persistStudentInRoom("Aluno Sem Nota");
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor envia o feedback sem nota
            mockMvc.perform(post(URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "text": "Sem nota"}
                                    """.formatted(student.getId())))
                    // Então a API responde 400
                    .andExpect(status().isBadRequest());

            entityManager.flush();
            entityManager.clear();

            // E nada é gravado
            assertThat(feedbackRepository.findByProblemId(problem.getId())).isEmpty();
        }

        @Test
        @DisplayName("[US16] Envio individual com texto vazio retorna 400 e nada é gravado")
        void sendFeedback_EmptyText_Returns400AndDoesNotPersist() throws Exception {
            // Dado um aluno ativo da sala
            User student = persistStudentInRoom("Aluno Sem Texto");
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor envia o feedback com texto vazio
            mockMvc.perform(post(URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(feedbackJson(student.getId(), 8.0, "")))
                    // Então a API responde 400
                    .andExpect(status().isBadRequest());

            entityManager.flush();
            entityManager.clear();

            // E nada é gravado
            assertThat(feedbackRepository.findByProblemId(problem.getId())).isEmpty();
        }

        @Test
        @DisplayName("[US16] Lote com um item inválido retorna 400 e nenhum feedback do lote é gravado")
        void sendBatchFeedback_OneInvalidItem_Returns400AndPersistsNothing() throws Exception {
            // Dado dois alunos ativos da sala
            User studentA = persistStudentInRoom("Aluno A");
            User studentB = persistStudentInRoom("Aluno B");
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor envia um lote em que o segundo item não tem nota
            mockMvc.perform(post(BATCH_URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"feedbacks": [
                                      %s,
                                      {"studentId": "%s", "text": "Sem nota"}
                                    ]}
                                    """.formatted(feedbackJson(studentA.getId(), 9.0, "Ótimo"), studentB.getId())))
                    // Então a API responde 400
                    .andExpect(status().isBadRequest());

            entityManager.flush();
            entityManager.clear();

            // E nem o item válido é gravado (o lote é atômico)
            assertThat(feedbackRepository.findByProblemId(problem.getId())).isEmpty();
        }

        @Test
        @DisplayName("[US16] Aluno tentando enviar feedback recebe 403 e nada é gravado")
        void sendFeedback_StudentProfile_Returns403AndDoesNotPersist() throws Exception {
            // Dado um aluno da sala tentando enviar feedback para si mesmo
            User student = persistStudentInRoom("Aluno Intruso");
            entityManager.flush();
            entityManager.clear();

            // Quando ele aciona o endpoint
            mockMvc.perform(post(URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(feedbackJson(student.getId(), 10.0, "Quero nota máxima")))
                    // Então a operação é barrada com 403
                    .andExpect(status().isForbidden());

            entityManager.flush();
            entityManager.clear();

            // E nada é gravado
            assertThat(feedbackRepository.findByProblemId(problem.getId())).isEmpty();
        }

        @Test
        @DisplayName("[US16] Envio para aluno que não pertence à sala retorna 400 e nada é gravado")
        void sendFeedback_StudentNotInRoom_Returns400AndDoesNotPersist() throws Exception {
            // Dado um usuário que existe, mas não é membro da sala
            User outsider = persistUser("Aluno de Fora", "fora." + UUID.randomUUID() + "@uefs.br");
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor tenta enviar o feedback
            mockMvc.perform(post(URL, problem.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(feedbackJson(outsider.getId(), 8.0, "Bom")))
                    // Então a API responde 400
                    .andExpect(status().isBadRequest());

            entityManager.flush();
            entityManager.clear();

            // E nada é gravado
            assertThat(feedbackRepository.findByProblemId(problem.getId())).isEmpty();
        }

        @Test
        @DisplayName("[US16] Problema inexistente retorna 404")
        void sendFeedback_NonExistentProblem_Returns404() throws Exception {
            // Quando o tutor envia feedback para um problema que não existe
            mockMvc.perform(post(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(feedbackJson(UUID.randomUUID(), 8.0, "Bom")))
                    // Então a API responde 404
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("[US16] Requisição sem token JWT retorna 401 antes de qualquer regra de negócio")
        void sendFeedback_NoToken_Returns401() throws Exception {
            // Quando a requisição chega sem autenticação
            mockMvc.perform(post(URL, problem.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(feedbackJson(UUID.randomUUID(), 8.0, "Bom")))
                    // Então é barrada antes de qualquer lógica de negócio
                    .andExpect(status().isUnauthorized());
        }
    }
}