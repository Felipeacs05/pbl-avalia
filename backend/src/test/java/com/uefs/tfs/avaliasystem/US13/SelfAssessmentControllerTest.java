package com.uefs.tfs.avaliasystem.US13;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.controller.SelfAssessmentController;
import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.security.SecurityConfig;
import com.uefs.tfs.avaliasystem.service.SelfAssessmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobertura de Critérios da US13 na camada Controller:
 * - Submissão de autoavaliação (nota de 0 a 10 e comentário)
 * - Bean Validation: valores fora do limite (15, -1) e comentário em branco geram 400
 * - Período fechado dispara AccessDeniedException mapeado para 403
 */
@WebMvcTest(SelfAssessmentController.class)
@Import(SecurityConfig.class)
@TestConfig
class SelfAssessmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private SelfAssessmentService service;

    @Nested
    @DisplayName("[US13] Cenários Válidos")
    class Validos {

        @Test
        @DisplayName("[US13] submitSelfAssessment_DadosValidos_Retorna201")
        void submitSelfAssessment_DadosValidos_Retorna201() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            AssessmentRequest request = new AssessmentRequest(null, 8.5, "Participei ativamente de todas as sessoes");

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(service, times(1)).submitSelfAssessment(eq(problemId), eq(studentId), any());
        }

        @Test
        @DisplayName("[US13] submitSelfAssessment_LimitesExatos0e10_Retorna201")
        void submitSelfAssessment_LimitesExatos0e10_Retorna201() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            AssessmentRequest requestZero = new AssessmentRequest(null, 0.0, "Nota zero dentro do limite");
            AssessmentRequest requestDez = new AssessmentRequest(null, 10.0, "Nota dez dentro do limite");

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestZero)))
                    .andExpect(status().isCreated());

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requestDez)))
                    .andExpect(status().isCreated());
        }
    }

    @Nested
    @DisplayName("[US13] Cenários Inválidos (Bean Validation & Segurança)")
    class Invalidos {

        @Test
        @DisplayName("[US13] submitSelfAssessment_NotaMaiorQueDez_Retorna400ENuncaChamaService")
        void submitSelfAssessment_NotaMaiorQueDez_Retorna400ENuncaChamaService() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            AssessmentRequest request = new AssessmentRequest(null, 15.0, "Nota invalida");

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());

            verify(service, never()).submitSelfAssessment(any(), any(), any());
        }

        @Test
        @DisplayName("[US13] submitSelfAssessment_NotaNegativa_Retorna400ENuncaChamaService")
        void submitSelfAssessment_NotaNegativa_Retorna400ENuncaChamaService() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            AssessmentRequest request = new AssessmentRequest(null, -1.0, "Nota negativa");

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());

            verify(service, never()).submitSelfAssessment(any(), any(), any());
        }

        @Test
        @DisplayName("[US13] submitSelfAssessment_ComentarioEmBranco_Retorna400")
        void submitSelfAssessment_ComentarioEmBranco_Retorna400() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            AssessmentRequest request = new AssessmentRequest(null, 8.0, "   ");

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());

            verify(service, never()).submitSelfAssessment(any(), any(), any());
        }

        @Test
        @DisplayName("[US13] submitSelfAssessment_PeriodoFechado_Retorna403")
        void submitSelfAssessment_PeriodoFechado_Retorna403() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            AssessmentRequest request = new AssessmentRequest(null, 9.0, "Periodo fechado");

            doThrow(new AccessDeniedException("Self-assessment is currently closed"))
                    .when(service).submitSelfAssessment(eq(problemId), eq(studentId), any());

            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());
        }
    }
}
