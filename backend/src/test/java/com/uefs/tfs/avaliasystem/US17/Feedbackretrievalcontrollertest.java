package com.uefs.tfs.avaliasystem.US17;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.FeedbackRetrievalController;
import com.uefs.tfs.avaliasystem.dto.FeedbackDTO;
import com.uefs.tfs.avaliasystem.dto.PageResponse;
import com.uefs.tfs.avaliasystem.security.FeedbackSecurity;
import com.uefs.tfs.avaliasystem.service.FeedbackRetrievalService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobertura de Critérios da US17 na camada Controller (FeedbackRetrievalTest):
 * - 200 OK para o aluno logado lendo o próprio feedback, com o nome do tutor no DTO
 * - 403 Forbidden quando o @PreAuthorize nega o acesso (ID de outro aluno)
 * - 200 OK com lista vazia (sem 404/500)
 * - 200 OK para o tutor emissor (a regra permite o dono e o emissor)
 * - Data Leak: o JSON não contém IDs internos, e-mail do tutor nem senha
 */
@WebMvcTest(FeedbackRetrievalController.class)
@Import(SecurityConfig.class)
@TestConfig
class FeedbackRetrievalControllerTest {

    private static final String URL = "/api/v1/students/{studentId}/feedbacks";

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private FeedbackRetrievalService service;

    @MockitoBean(name = "feedbackSecurity")
    private FeedbackSecurity feedbackSecurity;

    private FeedbackDTO sampleDto() {
        return new FeedbackDTO("Prof. Ana Souza", "Problema 1", 8.5,
                "Excelente participação", Instant.parse("2026-10-01T10:00:00Z"));
    }

    private PageResponse<FeedbackDTO> pageOf(FeedbackDTO... items) {
        return new PageResponse<>(List.of(items), 0, 10, items.length, items.length == 0 ? 0 : 1);
    }

    @Nested
    @DisplayName("[US17] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US17] Aluno logado lendo o próprio feedback recebe 200 com o nome do tutor")
        void getFeedbacks_OwnStudent_Returns200WithTutorName() throws Exception {
            // Dado um aluno autenticado e a regra de segurança permitindo o acesso
            UUID studentId = UUID.randomUUID();
            when(feedbackSecurity.canView(eq(studentId), any(Authentication.class))).thenReturn(true);
            when(service.getStudentFeedbacks(eq(studentId), eq(studentId), any(Pageable.class)))
                    .thenReturn(pageOf(sampleDto()));

            // Quando ele busca os próprios feedbacks
            mockMvc.perform(get(URL, studentId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString()))))
                    // Então recebe 200 com o nome do tutor emissor
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].tutorName").value("Prof. Ana Souza"))
                    .andExpect(jsonPath("$.content[0].grade").value(8.5))
                    .andExpect(jsonPath("$.content[0].text").value("Excelente participação"));

            verify(service, times(1)).getStudentFeedbacks(eq(studentId), eq(studentId), any(Pageable.class));
        }

        @Test
        @DisplayName("[US17] Aluno sem feedbacks recebe 200 com lista vazia")
        void getFeedbacks_NoFeedbacks_Returns200WithEmptyList() throws Exception {
            // Dado um aluno sem nenhum feedback
            UUID studentId = UUID.randomUUID();
            when(feedbackSecurity.canView(eq(studentId), any(Authentication.class))).thenReturn(true);
            when(service.getStudentFeedbacks(eq(studentId), eq(studentId), any(Pageable.class)))
                    .thenReturn(pageOf());

            // Quando ele busca seus feedbacks
            mockMvc.perform(get(URL, studentId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString()))))
                    // Então recebe 200 (e não 404/500) com a lista vazia
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isEmpty())
                    .andExpect(jsonPath("$.totalElements").value(0));
        }

        @Test
        @DisplayName("[US17] Tutor emissor lendo o feedback que criou recebe 200")
        void getFeedbacks_IssuerTutor_Returns200() throws Exception {
            // Dado um tutor emissor autorizado pela regra de segurança
            UUID studentId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(feedbackSecurity.canView(eq(studentId), any(Authentication.class))).thenReturn(true);
            when(service.getStudentFeedbacks(eq(studentId), eq(tutorId), any(Pageable.class)))
                    .thenReturn(pageOf(sampleDto()));

            // Quando o tutor busca os feedbacks do aluno
            mockMvc.perform(get(URL, studentId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    // Então recebe 200 e o serviço é chamado com o tutor como solicitante
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].tutorName").value("Prof. Ana Souza"));

            verify(service, times(1)).getStudentFeedbacks(eq(studentId), eq(tutorId), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("[US17] Cenários Inválidos")
    class InvalidScenarios {

        @Test
        @DisplayName("[US17] Acesso ao ID de outro aluno retorna 403 e o serviço nunca é chamado")
        void getFeedbacks_OtherStudentId_Returns403AndNeverCallsService() throws Exception {
            // Dado um aluno tentando ler o feedback de outro e a regra de segurança negando
            UUID otherStudentId = UUID.randomUUID();
            UUID loggedId = UUID.randomUUID();
            when(feedbackSecurity.canView(eq(otherStudentId), any(Authentication.class))).thenReturn(false);

            // Quando ele aciona o endpoint
            mockMvc.perform(get(URL, otherStudentId)
                            .with(jwt().jwt(j -> j.subject(loggedId.toString()))))
                    // Então recebe 403 Forbidden
                    .andExpect(status().isForbidden());

            verify(service, never()).getStudentFeedbacks(any(), any(), any());
        }

        @Test
        @DisplayName("[US17] Requisição sem token JWT retorna 401 e o serviço nunca é chamado")
        void getFeedbacks_NoToken_Returns401() throws Exception {
            // Quando a requisição chega sem autenticação
            mockMvc.perform(get(URL, UUID.randomUUID()))
                    // Então a cadeia de segurança barra com 401
                    .andExpect(status().isUnauthorized());

            verify(service, never()).getStudentFeedbacks(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("[US17] Prevenção de Vazamento de Dados")
    class DataLeakPrevention {

        @Test
        @DisplayName("[US17] JSON do feedback não vaza IDs internos, e-mail do tutor nem senha")
        void getFeedbacks_Response_DoesNotLeakSensitiveFields() throws Exception {
            // Dado um aluno autorizado com um feedback
            UUID studentId = UUID.randomUUID();
            when(feedbackSecurity.canView(eq(studentId), any(Authentication.class))).thenReturn(true);
            when(service.getStudentFeedbacks(eq(studentId), eq(studentId), any(Pageable.class)))
                    .thenReturn(pageOf(sampleDto()));

            // Quando ele busca os feedbacks
            String body = mockMvc.perform(get(URL, studentId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString()))))
                    .andExpect(status().isOk())
                    // Então nenhum campo sensível existe no item
                    .andExpect(jsonPath("$.content[0].id").doesNotExist())
                    .andExpect(jsonPath("$.content[0].studentId").doesNotExist())
                    .andExpect(jsonPath("$.content[0].problemId").doesNotExist())
                    .andExpect(jsonPath("$.content[0].tutorId").doesNotExist())
                    .andExpect(jsonPath("$.content[0].tutorEmail").doesNotExist())
                    .andExpect(jsonPath("$.content[0].email").doesNotExist())
                    .andExpect(jsonPath("$.content[0].password").doesNotExist())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

            // E o conjunto de chaves do item é exatamente o contrato público
            JsonNode item = objectMapper.readTree(body).get("content").get(0);
            Set<String> keys = new HashSet<>();
            item.fieldNames().forEachRemaining(keys::add);
            assertThat(keys).containsExactlyInAnyOrder("tutorName", "problemTitle", "grade", "text", "createdAt");
        }
    }
}