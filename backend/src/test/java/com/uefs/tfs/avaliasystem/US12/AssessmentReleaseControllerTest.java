package com.uefs.tfs.avaliasystem.US12;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.controller.AssessmentReleaseController;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.service.AssessmentReleaseService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
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
 * Teste de Controller da US12 usando @WebMvcTest.
 * Cobertura de critérios:
 * - Rotas PATCH para alternância dos toggles de autoavaliação e de pares
 * - Retorno 401 quando a requisição não possui token JWT
 * - Retorno 200 quando o tutor aciona o toggle com token válido
 * - Mapeamento de AccessDeniedException para HTTP 403 Forbidden sem vazar stack trace
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
    class ValidScenarios {

        @Test
        @DisplayName("[US12] toggle de autoavaliação - tutor autenticado - deve retornar 200 OK")
        void patchSelfAssessmentRelease_WhenTutorAuthenticated_ShouldReturn200() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            // Serviço mockado retorna sucesso para o tutor correto
            when(service.toggleSelfAssessment(eq(problemId), eq(tutorId))).thenReturn(new Problem());

            mockMvc.perform(patch("/api/v1/problems/{problemId}/self-assessment-release", problemId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk());

            // Verifica que o serviço foi chamado exatamente uma vez com os IDs corretos
            verify(service, times(1)).toggleSelfAssessment(eq(problemId), eq(tutorId));
        }

        @Test
        @DisplayName("[US12] toggle de pares - tutor autenticado - deve retornar 200 OK")
        void patchPeerAssessmentRelease_WhenTutorAuthenticated_ShouldReturn200() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            // Serviço mockado retorna sucesso para o tutor correto
            when(service.togglePeerAssessment(eq(problemId), eq(tutorId))).thenReturn(new Problem());

            mockMvc.perform(patch("/api/v1/problems/{problemId}/peer-assessment-release", problemId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk());

            verify(service, times(1)).togglePeerAssessment(eq(problemId), eq(tutorId));
        }
    }

    @Nested
    @DisplayName("[US12] Cenários Inválidos")
    class InvalidScenarios {

        @Test
        @DisplayName("[US12] toggle de autoavaliação - sem token JWT - deve retornar 401 Unauthorized")
        void patchSelfAssessmentRelease_WhenNoToken_ShouldReturn401() throws Exception {
            UUID problemId = UUID.randomUUID();
            // Requisição sem cabeçalho Authorization deve ser bloqueada pela cadeia de filtros de segurança
            mockMvc.perform(patch("/api/v1/problems/{problemId}/self-assessment-release", problemId))
                    .andExpect(status().isUnauthorized());

            // Serviço jamais deve ser alcançado sem autenticação válida
            verify(service, never()).toggleSelfAssessment(any(), any());
        }

        @Test
        @DisplayName("[US12] toggle de autoavaliação - usuário não é tutor da sala - deve retornar 403 Forbidden")
        void patchSelfAssessmentRelease_WhenNotTutor_ShouldReturn403() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID alunoId = UUID.randomUUID();

            // Simula que o serviço rejeita o usuário por não ser tutor da sala
            doThrow(new AccessDeniedException("Somente o tutor pode alternar o toggle de autoavaliação"))
                    .when(service).toggleSelfAssessment(eq(problemId), eq(alunoId));

            mockMvc.perform(patch("/api/v1/problems/{problemId}/self-assessment-release", problemId)
                            .with(jwt().jwt(j -> j.subject(alunoId.toString()))))
                    .andExpect(status().isForbidden());
        }
    }
}
