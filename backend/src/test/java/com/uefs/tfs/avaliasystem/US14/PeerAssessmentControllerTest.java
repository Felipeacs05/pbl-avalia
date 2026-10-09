package com.uefs.tfs.avaliasystem.US14;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.controller.PeerAssessmentController;
import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.security.SecurityConfig;
import com.uefs.tfs.avaliasystem.service.PeerAssessmentService;
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

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobertura de Critérios da US14 na camada Controller:
 * - Avaliação de colegas de grupo em lote (Batch JSON)
 * - Bean Validation: qualquer item com nota inválida barra a requisição inteira com 400
 * - Violação de isolamento de grupo ou período fechado dispara 403 Forbidden
 */
@WebMvcTest(PeerAssessmentController.class)
@Import(SecurityConfig.class)
@TestConfig
class PeerAssessmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private PeerAssessmentService service;

    @Nested
    @DisplayName("[US14] Cenários Válidos")
    class Validos {

        @Test
        @DisplayName("[US14] submitPeerAssessments_LoteValido_Retorna201")
        void submitPeerAssessments_LoteValido_Retorna201() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            UUID peerId1 = UUID.randomUUID();
            UUID peerId2 = UUID.randomUUID();

            List<AssessmentRequest> requests = List.of(
                    new AssessmentRequest(peerId1, 9.0, "Excelente cooperacao"),
                    new AssessmentRequest(peerId2, 8.0, "Boa participacao")
            );

            mockMvc.perform(post("/api/v1/problems/{problemId}/peer-assessments", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requests)))
                    .andExpect(status().isCreated());

            verify(service, times(1)).submitPeerAssessments(eq(problemId), eq(studentId), any());
        }
    }

    @Nested
    @DisplayName("[US14] Cenários Inválidos")
    class Invalidos {

        @Test
        @DisplayName("[US14] submitPeerAssessments_ColegaComNotaInvalida_Retorna400ENuncaChamaService")
        void submitPeerAssessments_ColegaComNotaInvalida_Retorna400ENuncaChamaService() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            UUID peerId = UUID.randomUUID();

            List<AssessmentRequest> requests = List.of(
                    new AssessmentRequest(peerId, 15.0, "Nota fora do intervalo")
            );

            mockMvc.perform(post("/api/v1/problems/{problemId}/peer-assessments", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requests)))
                    .andExpect(status().isBadRequest());

            verify(service, never()).submitPeerAssessments(any(), any(), any());
        }

        @Test
        @DisplayName("[US14] submitPeerAssessments_AlvoDeOutroGrupo_Retorna403")
        void submitPeerAssessments_AlvoDeOutroGrupo_Retorna403() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            UUID peerId = UUID.randomUUID();

            doThrow(new AccessDeniedException("Target is not in the same team"))
                    .when(service).submitPeerAssessments(eq(problemId), eq(studentId), any());

            List<AssessmentRequest> requests = List.of(
                    new AssessmentRequest(peerId, 8.5, "Colega de outro grupo")
            );

            mockMvc.perform(post("/api/v1/problems/{problemId}/peer-assessments", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requests)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US14] submitPeerAssessments_PeriodoFechado_Retorna403")
        void submitPeerAssessments_PeriodoFechado_Retorna403() throws Exception {
            UUID problemId = UUID.randomUUID();
            UUID studentId = UUID.randomUUID();
            UUID peerId = UUID.randomUUID();

            doThrow(new AccessDeniedException("Peer-assessment is currently closed"))
                    .when(service).submitPeerAssessments(eq(problemId), eq(studentId), any());

            List<AssessmentRequest> requests = List.of(
                    new AssessmentRequest(peerId, 8.5, "Periodo fechado")
            );

            mockMvc.perform(post("/api/v1/problems/{problemId}/peer-assessments", problemId)
                            .with(jwt().jwt(j -> j.subject(studentId.toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(requests)))
                    .andExpect(status().isForbidden());
        }
    }
}
