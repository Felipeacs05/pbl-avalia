package com.uefs.tfs.avaliasystem.US16;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.FeedbackController;
import com.uefs.tfs.avaliasystem.dto.FeedbackResponse;
import com.uefs.tfs.avaliasystem.exception.ProblemNotFoundException;
import com.uefs.tfs.avaliasystem.service.FeedbackService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobertura de Critérios da US16 na camada Controller:
 * - Payload individual e payload em lote válidos retornam 201 com os dados dos feedbacks
 * - Bean Validation: nota nula, texto vazio, nota fora de 0..10, aluno ausente e lote vazio/com item inválido geram 400
 *   e o Service nunca é chamado
 * - Aluno (ROLE_STUDENT) é barrado com 403, requisição sem token com 401 e problema inexistente com 404
 */
@WebMvcTest(FeedbackController.class)
@Import(SecurityConfig.class)
@TestConfig
class FeedbackControllerTest {

    private static final String URL = "/api/v1/problems/{problemId}/feedbacks";
    private static final String BATCH_URL = "/api/v1/problems/{problemId}/feedbacks/batch";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FeedbackService service;

    @Nested
    @DisplayName("[US16] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US16] Payload individual válido retorna 201 com os dados do feedback")
        void sendFeedback_ValidPayload_Returns201() throws Exception {
            // Dado um tutor autenticado e um serviço que devolve o feedback salvo
            UUID problemId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            when(service.sendFeedback(eq(problemId), eq(tutorId), any()))
                    .thenReturn(new FeedbackResponse(UUID.randomUUID(), problemId, studentId, 8.5, "Ótima participação"));

            // Quando ele envia um payload individual válido
            mockMvc.perform(post(URL, problemId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "grade": 8.5, "text": "Ótima participação"}
                                    """.formatted(studentId)))
                    // Então recebe 201 com nota e texto
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.studentId").value(studentId.toString()))
                    .andExpect(jsonPath("$.grade").value(8.5))
                    .andExpect(jsonPath("$.text").value("Ótima participação"));

            verify(service, times(1)).sendFeedback(eq(problemId), eq(tutorId), any());
        }

        @Test
        @DisplayName("[US16] Payload de lote válido retorna 201 com um item por aluno")
        void sendBatchFeedback_ValidPayload_Returns201() throws Exception {
            // Dado um tutor autenticado e um serviço que devolve os feedbacks do lote
            UUID problemId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            UUID studentA = UUID.randomUUID();
            UUID studentB = UUID.randomUUID();
            when(service.sendBatchFeedback(eq(problemId), eq(tutorId), any()))
                    .thenReturn(List.of(
                            new FeedbackResponse(UUID.randomUUID(), problemId, studentA, 9.0, "Excelente"),
                            new FeedbackResponse(UUID.randomUUID(), problemId, studentB, 7.0, "Bom")));

            // Quando ele envia um lote válido
            mockMvc.perform(post(BATCH_URL, problemId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"feedbacks": [
                                      {"studentId": "%s", "grade": 9.0, "text": "Excelente"},
                                      {"studentId": "%s", "grade": 7.0, "text": "Bom"}
                                    ]}
                                    """.formatted(studentA, studentB)))
                    // Então recebe 201 com os dois feedbacks
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.length()").value(2))
                    .andExpect(jsonPath("$[0].studentId").value(studentA.toString()))
                    .andExpect(jsonPath("$[1].grade").value(7.0));

            verify(service, times(1)).sendBatchFeedback(eq(problemId), eq(tutorId), any());
        }
    }

    @Nested
    @DisplayName("[US16] Cenários Inválidos")
    class InvalidScenarios {

        @Test
        @DisplayName("[US16] Payload individual com nota nula retorna 400 e o serviço nunca é chamado")
        void sendFeedback_NullGrade_Returns400AndNeverCallsService() throws Exception {
            // Dado um payload sem o campo grade
            // Quando o tutor envia a requisição
            mockMvc.perform(post(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "text": "Bom trabalho"}
                                    """.formatted(UUID.randomUUID())))
                    // Então a Bean Validation barra com 400 e informa o campo
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.grade").value("A nota é obrigatória"));

            verify(service, never()).sendFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Payload individual com texto vazio retorna 400 e o serviço nunca é chamado")
        void sendFeedback_EmptyText_Returns400AndNeverCallsService() throws Exception {
            // Dado um payload com texto vazio
            // Quando o tutor envia a requisição
            mockMvc.perform(post(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "grade": 8.0, "text": ""}
                                    """.formatted(UUID.randomUUID())))
                    // Então a Bean Validation barra com 400 e informa o campo
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.text").value("O texto do feedback não pode ser vazio"));

            verify(service, never()).sendFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Payload individual com texto só de espaços retorna 400")
        void sendFeedback_BlankText_Returns400() throws Exception {
            // Dado um payload com texto composto apenas por espaços
            // Quando o tutor envia a requisição
            mockMvc.perform(post(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "grade": 8.0, "text": "   "}
                                    """.formatted(UUID.randomUUID())))
                    // Então a requisição é rejeitada
                    .andExpect(status().isBadRequest());

            verify(service, never()).sendFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Payload individual com nota acima de 10 retorna 400")
        void sendFeedback_GradeOutOfRange_Returns400() throws Exception {
            // Dado uma nota acima do limite
            // Quando o tutor envia a requisição
            mockMvc.perform(post(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "grade": 10.5, "text": "Nota inválida"}
                                    """.formatted(UUID.randomUUID())))
                    // Então a requisição é rejeitada
                    .andExpect(status().isBadRequest());

            verify(service, never()).sendFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Payload individual sem o aluno retorna 400")
        void sendFeedback_NullStudent_Returns400() throws Exception {
            // Dado um payload sem studentId
            // Quando o tutor envia a requisição
            mockMvc.perform(post(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"grade": 8.0, "text": "Bom trabalho"}
                                    """))
                    // Então a Bean Validation barra com 400 e informa o campo
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.studentId").value("O aluno é obrigatório"));

            verify(service, never()).sendFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Lote com um item de nota nula retorna 400 e o serviço nunca é chamado")
        void sendBatchFeedback_ItemWithNullGrade_Returns400AndNeverCallsService() throws Exception {
            // Dado um lote em que o segundo item não tem nota
            // Quando o tutor envia a requisição
            mockMvc.perform(post(BATCH_URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"feedbacks": [
                                      {"studentId": "%s", "grade": 8.0, "text": "Bom"},
                                      {"studentId": "%s", "text": "Sem nota"}
                                    ]}
                                    """.formatted(UUID.randomUUID(), UUID.randomUUID())))
                    // Então o lote inteiro é rejeitado com 400
                    .andExpect(status().isBadRequest());

            verify(service, never()).sendBatchFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Lote com um item de texto vazio retorna 400 e o serviço nunca é chamado")
        void sendBatchFeedback_ItemWithEmptyText_Returns400AndNeverCallsService() throws Exception {
            // Dado um lote em que um item tem texto vazio
            // Quando o tutor envia a requisição
            mockMvc.perform(post(BATCH_URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"feedbacks": [
                                      {"studentId": "%s", "grade": 8.0, "text": ""}
                                    ]}
                                    """.formatted(UUID.randomUUID())))
                    // Então o lote inteiro é rejeitado com 400
                    .andExpect(status().isBadRequest());

            verify(service, never()).sendBatchFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Lote com lista vazia retorna 400 e o serviço nunca é chamado")
        void sendBatchFeedback_EmptyList_Returns400AndNeverCallsService() throws Exception {
            // Dado um lote sem nenhum feedback
            // Quando o tutor envia a requisição
            mockMvc.perform(post(BATCH_URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"feedbacks": []}
                                    """))
                    // Então a Bean Validation barra com 400 e informa o campo
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.feedbacks").value("A lista de feedbacks não pode estar vazia"));

            verify(service, never()).sendBatchFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Aluno (ROLE_STUDENT) tentando enviar feedback recebe 403")
        void sendFeedback_StudentRole_Returns403() throws Exception {
            // Dado um aluno autenticado (ROLE_STUDENT) e um serviço que nega o acesso
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            doThrow(new AccessDeniedException("Acesso negado: apenas o tutor da sala pode enviar feedbacks"))
                    .when(service).sendFeedback(eq(problemId), eq(studentId), any());

            // Quando ele tenta enviar um feedback
            mockMvc.perform(post(URL, problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString()))
                                    .authorities(new SimpleGrantedAuthority("ROLE_STUDENT")))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "grade": 10.0, "text": "Quero enviar"}
                                    """.formatted(UUID.randomUUID())))
                    // Então recebe 403 Forbidden
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US16] Requisição sem token JWT retorna 401 e o serviço nunca é chamado")
        void sendFeedback_NoToken_Returns401() throws Exception {
            // Dado uma requisição sem token JWT
            // Quando ela chega à API
            mockMvc.perform(post(URL, UUID.randomUUID())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "grade": 8.0, "text": "Bom"}
                                    """.formatted(UUID.randomUUID())))
                    // Então a cadeia de segurança barra com 401 e o serviço nunca é alcançado
                    .andExpect(status().isUnauthorized());

            verify(service, never()).sendFeedback(any(), any(), any());
        }

        @Test
        @DisplayName("[US16] Problema inexistente retorna 404")
        void sendFeedback_NonExistentProblem_Returns404() throws Exception {
            // Dado um serviço que não encontra o problema
            UUID problemId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            doThrow(new ProblemNotFoundException("Problema não encontrado"))
                    .when(service).sendFeedback(eq(problemId), eq(tutorId), any());

            // Quando o tutor envia um payload válido
            mockMvc.perform(post(URL, problemId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"studentId": "%s", "grade": 8.0, "text": "Bom"}
                                    """.formatted(UUID.randomUUID())))
                    // Então recebe 404 com a mensagem em português
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Problema não encontrado"));
        }
    }
}