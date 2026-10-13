package com.uefs.tfs.avaliasystem.US15;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.GradeAdjustmentController;
import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentResponse;
import com.uefs.tfs.avaliasystem.exception.AssessmentNotFoundException;
import com.uefs.tfs.avaliasystem.service.GradeAdjustmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobertura de Critérios da US15 na camada Controller:
 * - Payload válido retorna 200 com a flag modifiedByTutor = true
 * - Bean Validation: justificativa ausente/em branco ou nota fora de 0..10 geram 400 e o Service nunca é chamado
 * - Aluno (ROLE_STUDENT) é barrado com 403, requisição sem token com 401 e avaliação inexistente com 404
 */
@WebMvcTest(GradeAdjustmentController.class)
@Import(SecurityConfig.class)
@TestConfig
class GradeAdjustmentControllerTest {

    private static final String URL = "/api/v1/assessments/{assessmentId}/grade-adjustment";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GradeAdjustmentService service;

    @Nested
    @DisplayName("[US15] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US15] Payload válido retorna 200 com a flag de nota modificada pelo tutor")
        void adjustGrade_ValidPayload_Returns200WithModifiedFlag() throws Exception {
            // Dado um tutor autenticado e um serviço que devolve o ajuste auditado
            UUID assessmentId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(service.adjustGrade(eq(assessmentId), eq(tutorId), any()))
                    .thenReturn(new GradeAdjustmentResponse(assessmentId, 6.0, 8.5, "Nota subestimada", true));

            // Quando ele envia um payload válido
            mockMvc.perform(patch(URL, assessmentId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.5, "justification": "Nota subestimada"}
                                    """))
                    // Então recebe 200 com original, ajustada e a flag de modificação
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.originalGrade").value(6.0))
                    .andExpect(jsonPath("$.adjustedGrade").value(8.5))
                    .andExpect(jsonPath("$.justification").value("Nota subestimada"))
                    .andExpect(jsonPath("$.modifiedByTutor").value(true));

            verify(service, times(1)).adjustGrade(eq(assessmentId), eq(tutorId), any());
        }
    }

    @Nested
    @DisplayName("[US15] Cenários Inválidos")
    class InvalidScenarios {

        @Test
        @DisplayName("[US15] Payload sem justificativa retorna 400 e o serviço nunca é chamado")
        void adjustGrade_WithoutJustification_Returns400AndNeverCallsService() throws Exception {
            // Dado um payload sem o campo justification
            UUID tutorId = UUID.randomUUID();

            // Quando o tutor envia a requisição
            mockMvc.perform(patch(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(tutorId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.5}
                                    """))
                    // Então a Bean Validation barra com 400 e informa o campo
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.justification").value("Justificativa é obrigatória"));

            verify(service, never()).adjustGrade(any(), any(), any());
        }

        @Test
        @DisplayName("[US15] Justificativa só com espaços retorna 400 e o serviço nunca é chamado")
        void adjustGrade_BlankJustification_Returns400AndNeverCallsService() throws Exception {
            // Dado uma justificativa composta apenas por espaços
            // Quando o tutor envia a requisição
            mockMvc.perform(patch(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.5, "justification": "   "}
                                    """))
                    // Então a requisição é rejeitada
                    .andExpect(status().isBadRequest());

            verify(service, never()).adjustGrade(any(), any(), any());
        }

        @Test
        @DisplayName("[US15] Nota ajustada fora do intervalo de 0 a 10 retorna 400 e o serviço nunca é chamado")
        void adjustGrade_GradeOutOfRange_Returns400AndNeverCallsService() throws Exception {
            // Dado uma nota ajustada acima de 10
            // Quando o tutor envia a requisição
            mockMvc.perform(patch(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 10.5, "justification": "Nota inválida"}
                                    """))
                    // Então a requisição é rejeitada
                    .andExpect(status().isBadRequest());

            verify(service, never()).adjustGrade(any(), any(), any());
        }

        @Test
        @DisplayName("[US15] Aluno (ROLE_STUDENT) tentando alterar a nota recebe 403")
        void adjustGrade_StudentRole_Returns403() throws Exception {
            // Dado um aluno autenticado (ROLE_STUDENT) e um serviço que nega o acesso
            UUID assessmentId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            doThrow(new AccessDeniedException("Acesso negado: apenas o tutor da sala pode ajustar notas"))
                    .when(service).adjustGrade(eq(assessmentId), eq(studentId), any());

            // Quando ele tenta alterar a nota
            mockMvc.perform(patch(URL, assessmentId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString()))
                                    .authorities(new SimpleGrantedAuthority("ROLE_STUDENT")))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 10.0, "justification": "Quero nota máxima"}
                                    """))
                    // Então recebe 403 Forbidden
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US15] Requisição sem token JWT retorna 401 e o serviço nunca é chamado")
        void adjustGrade_NoToken_Returns401() throws Exception {
            // Dado uma requisição sem token JWT
            // Quando ela chega à API
            mockMvc.perform(patch(URL, UUID.randomUUID())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.0, "justification": "Justificativa"}
                                    """))
                    // Então a cadeia de segurança barra com 401 e o serviço nunca é alcançado
                    .andExpect(status().isUnauthorized());

            verify(service, never()).adjustGrade(any(), any(), any());
        }

        @Test
        @DisplayName("[US15] Avaliação inexistente retorna 404 com mensagem em português")
        void adjustGrade_NonExistentAssessment_Returns404() throws Exception {
            // Dado um serviço que não encontra a avaliação
            UUID assessmentId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            doThrow(new AssessmentNotFoundException("Avaliação não encontrada"))
                    .when(service).adjustGrade(eq(assessmentId), eq(tutorId), any());

            // Quando o tutor envia um payload válido
            mockMvc.perform(patch(URL, assessmentId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"adjustedGrade": 8.0, "justification": "Justificativa"}
                                    """))
                    // Então recebe 404 com a mensagem em português
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Avaliação não encontrada"));
        }
    }
}