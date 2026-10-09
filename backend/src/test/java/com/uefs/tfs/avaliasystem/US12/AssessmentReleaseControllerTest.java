package com.uefs.tfs.avaliasystem.US12;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.controller.AssessmentReleaseController;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.security.SecurityConfig;
import com.uefs.tfs.avaliasystem.service.AssessmentReleaseService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobertura de Critérios de Aceite da US12 na camada Controller:
 * - Liberação de Autoavaliação e Avaliação entre Pares
 * - Autenticação JWT obrigatória (401 se ausente)
 * - Delegação correta para AssessmentReleaseService
 * - Mapeamento de AccessDeniedException -> 403 Forbidden
 */
@WebMvcTest(AssessmentReleaseController.class)
@Import(SecurityConfig.class)
@TestConfig
class AssessmentReleaseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AssessmentReleaseService service;

    @Nested
    @DisplayName("[US12] Cenários Válidos")
    class Validos {

        @Test
        @DisplayName("[US12] toggleSelfAssessment_ComTokenTutor_Retorna200")
        void toggleSelfAssessment_ComTokenTutor_Retorna200() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(service.toggleSelfAssessment(eq(problemId), eq(tutorId))).thenReturn(new Problem());

            mockMvc.perform(patch("/api/v1/problems/{problemId}/self-assessment-release", problemId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk());

            verify(service, times(1)).toggleSelfAssessment(eq(problemId), eq(tutorId));
        }

        @Test
        @DisplayName("[US12] togglePeerAssessment_ComTokenTutor_Retorna200")
        void togglePeerAssessment_ComTokenTutor_Retorna200() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(service.togglePeerAssessment(eq(problemId), eq(tutorId))).thenReturn(new Problem());

            mockMvc.perform(patch("/api/v1/problems/{problemId}/peer-assessment-release", problemId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk());

            verify(service, times(1)).togglePeerAssessment(eq(problemId), eq(tutorId));
        }
    }

    @Nested
    @DisplayName("[US12] Cenários Inválidos")
    class Invalidos {

        @Test
        @DisplayName("[US12] toggleSelfAssessment_SemToken_Retorna401")
        void toggleSelfAssessment_SemToken_Retorna401() throws Exception {
            UUID problemId = UUID.randomUUID();

            mockMvc.perform(patch("/api/v1/problems/{problemId}/self-assessment-release", problemId))
                    .andExpect(status().isUnauthorized());

            verify(service, never()).toggleSelfAssessment(any(), any());
        }

        @Test
        @DisplayName("[US12] toggleSelfAssessment_NaoTutor_Retorna403")
        void toggleSelfAssessment_NaoTutor_Retorna403() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID alunoId = UUID.randomUUID();

            doThrow(new AccessDeniedException("Only the tutor can toggle self-assessment"))
                    .when(service).toggleSelfAssessment(eq(problemId), eq(alunoId));

            mockMvc.perform(patch("/api/v1/problems/{problemId}/self-assessment-release", problemId)
                            .with(jwt().jwt(j -> j.subject(alunoId.toString()))))
                    .andExpect(status().isForbidden());
        }
    }
}
