package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.PerformanceTableController;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.service.PerformanceTableService;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testes de camada de Controller (MockMvc + Mockito) para a US07.
 *
 * Contrato vigente (definido com o backend — Leonardo):
 *   POST   /api/v1/rooms/{roomId}/criteria            → 201 Created
 *   GET    /api/v1/rooms/{roomId}/criteria            → 200 OK  (somente tutor da sala)
 *   DELETE /api/v1/rooms/{roomId}/criteria/{criterionId} → 204 No Content
 *
 * Sala inexistente → 404 Not Found (pendência: handler no GlobalExceptionHandler).
 * Modelo (A): roomId no PATH; sem PerformanceTable como entidade visível na API.
 * GET restrito ao tutor da sala.
 */
@WebMvcTest(PerformanceTableController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("US07 - Testes de Controller de Critérios da Sala")
class PerformanceTableControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PerformanceTableService performanceTableService;

    private final String TUTOR_UUID       = "123e4567-e89b-12d3-a456-426614174000";
    private final String OTHER_TUTOR_UUID = "999e4567-e89b-12d3-a456-426614174999";
    private final String STUDENT_UUID     = "aaa14567-e89b-12d3-a456-426614174aaa";
    private final String ROOM_UUID        = "550e8400-e29b-41d4-a716-446655440000";
    private final String OTHER_ROOM_UUID  = "660e8400-e29b-41d4-a716-446655440011";
    private final String CRITERION_UUID   = "crit-01";

    // =========================================================================
    // POST /api/v1/rooms/{roomId}/criteria — ADICIONAR CRITÉRIO
    // =========================================================================

    @Test
    @DisplayName("POST - Tutor da sala: deve criar critério e retornar 201 (Created)")
    void postCriterion_TutorDaSala_Returns201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Postura e Ética", "Comportamento em tutoria", 3.0);
        CriterionResponse response = new CriterionResponse("crit-01", "Postura e Ética", "Comportamento em tutoria", 3.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criterionId").value("crit-01"))
                .andExpect(jsonPath("$.criteriaName").value("Postura e Ética"));

        verify(performanceTableService, Mockito.times(1))
                .addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("POST - Sem token: deve retornar 401 (Unauthorized)")
    void postCriterion_SemToken_Returns401() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Postura", "Descrição", 2.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verify(performanceTableService, never()).addCriterionToRoom(any(), any(), any());
    }

    @Test
    @DisplayName("POST - Tutor de OUTRA sala (IDOR): deve retornar 403 e não persistir")
    void postCriterion_TutorDeOutraSala_Returns403() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Liderança", "Proatividade", 2.0);
        Mockito.when(performanceTableService.addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(OTHER_TUTOR_UUID)))
                .thenThrow(new SecurityException("Apenas o tutor responsável pela sala pode gerenciar critérios."));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(OTHER_TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST - Aluno membro da sala: deve retornar 403 e não persistir")
    void postCriterion_AlunoMembroDaSala_Returns403() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Critério Indevido", "Sem permissão", 1.0);
        Mockito.when(performanceTableService.addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(STUDENT_UUID)))
                .thenThrow(new SecurityException("Apenas o tutor responsável pela sala pode gerenciar critérios."));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(STUDENT_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST - Sala inexistente: deve retornar 404 (Not Found)")
    void postCriterion_SalaInexistente_Returns404() throws Exception {
        // Arrange (Preparar)
        String salaInexistenteId = "sala-inexistente-uuid";
        CriterionRequest request = new CriterionRequest("Liderança", "Proatividade", 1.0);
        Mockito.when(performanceTableService.addCriterionToRoom(eq(salaInexistenteId), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenThrow(new IllegalStateException("Sala não encontrada: " + salaInexistenteId));

        // Act & Assert (Executar e Validar)
        // Nota: IllegalStateException deve ser mapeada para 404 pelo GlobalExceptionHandler (pendência para o Leonardo).
        mockMvc.perform(post("/api/v1/rooms/" + salaInexistenteId + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // POST - Payloads inválidos (reaproveitando InvalidCriterionPayloads)
    // =========================================================================

    @ParameterizedTest(name = "[{index}] POST /criteria rejeitado para: {0}")
    @MethodSource("com.uefs.tfs.avaliasystem.US07.InvalidCriterionPayloads#provideInvalidCriterionRequests")
    @DisplayName("POST - Payload inválido: deve retornar 400 (Bean Validation) sem acionar o service")
    void postCriterion_PayloadInvalido_Returns400(String scenario, CriterionRequest invalidRequest) throws Exception {
        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors").isMap());

        verify(performanceTableService, never()).addCriterionToRoom(any(), any(), any());
    }

    @Test
    @DisplayName("POST - Nome com 255 caracteres (limite máximo): deve retornar 201")
    void postCriterion_NomeCom255Caracteres_Returns201() throws Exception {
        // Arrange (Preparar)
        String nomeLimite = "A".repeat(255);
        CriterionRequest request = new CriterionRequest(nomeLimite, "Descrição de borda máxima", 1.0);
        CriterionResponse response = new CriterionResponse("crit-max", nomeLimite, "Descrição de borda máxima", 1.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value(nomeLimite));
    }

    @Test
    @DisplayName("POST - Peso zero (0.0): deve retornar 201")
    void postCriterion_PesoZero_Returns201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Critério Opcional", "Sem pontuação direta", 0.0);
        CriterionResponse response = new CriterionResponse("crit-zero", "Critério Opcional", "Sem pontuação direta", 0.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(0.0));
    }

    @Test
    @DisplayName("POST - Peso omitido no JSON: deve retornar 201 com peso padrão 1.0")
    void postCriterion_PesoOmitido_Returns201ComPesoPadrao() throws Exception {
        // Arrange (Preparar)
        String jsonSemPeso = "{\"criteriaName\": \"Participação\", \"criteriaDescription\": \"Presença ativa\"}";
        CriterionResponse response = new CriterionResponse("crit-def", "Participação", "Presença ativa", 1.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonSemPeso))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(1.0));
    }

    @Test
    @DisplayName("POST - Nome somente com hífens (\"---\"): deve retornar 201")
    void postCriterion_NomeSomenteHifens_Returns201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("---", "Separador", 1.0);
        CriterionResponse response = new CriterionResponse("crit-hyphen", "---", "Separador", 1.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("---"));
    }

    @Test
    @DisplayName("POST - Nome com acentos da língua portuguesa: deve retornar 201")
    void postCriterion_NomeComAcentos_Returns201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Raciocínio Lógico e Dedução", "Capacidade analítica", 4.0);
        CriterionResponse response = new CriterionResponse("crit-accent", "Raciocínio Lógico e Dedução", "Capacidade analítica", 4.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterionToRoom(eq(ROOM_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("Raciocínio Lógico e Dedução"));
    }

    // =========================================================================
    // GET /api/v1/rooms/{roomId}/criteria — LISTAR CRITÉRIOS DA SALA
    // =========================================================================

    @Test
    @DisplayName("GET - Tutor da sala: deve retornar lista de critérios com 200 (OK)")
    void getCriteria_TutorDaSala_Returns200() throws Exception {
        // Arrange (Preparar)
        List<CriterionResponse> criteria = List.of(
                new CriterionResponse("crit-01", "Postura e Ética", "Comportamento", 3.0, "ACTIVE"),
                new CriterionResponse("crit-02", "Raciocínio Lógico", "Análise", 5.0, "ACTIVE")
        );
        Mockito.when(performanceTableService.getCriteriaByRoom(eq(ROOM_UUID), eq(TUTOR_UUID)))
                .thenReturn(criteria);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].criterionId").value("crit-01"))
                .andExpect(jsonPath("$[1].criterionId").value("crit-02"));
    }

    @Test
    @DisplayName("GET - Sem token: deve retornar 401 (Unauthorized)")
    void getCriteria_SemToken_Returns401() throws Exception {
        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + ROOM_UUID + "/criteria"))
                .andExpect(status().isUnauthorized());

        verify(performanceTableService, never()).getCriteriaByRoom(any(), any());
    }

    @Test
    @DisplayName("GET - Tutor de OUTRA sala (IDOR): deve retornar 403")
    void getCriteria_TutorDeOutraSala_Returns403() throws Exception {
        // Arrange (Preparar)
        Mockito.when(performanceTableService.getCriteriaByRoom(eq(ROOM_UUID), eq(OTHER_TUTOR_UUID)))
                .thenThrow(new SecurityException("Apenas o tutor responsável pela sala pode visualizar os critérios."));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(OTHER_TUTOR_UUID))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET - Aluno membro da sala: deve retornar 403")
    void getCriteria_AlunoMembro_Returns403() throws Exception {
        // Arrange (Preparar)
        Mockito.when(performanceTableService.getCriteriaByRoom(eq(ROOM_UUID), eq(STUDENT_UUID)))
                .thenThrow(new SecurityException("Apenas o tutor responsável pela sala pode visualizar os critérios."));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(STUDENT_UUID))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET - Sala inexistente: deve retornar 404 (Not Found)")
    void getCriteria_SalaInexistente_Returns404() throws Exception {
        // Arrange (Preparar)
        String salaInexistenteId = "sala-inexistente-uuid";
        Mockito.when(performanceTableService.getCriteriaByRoom(eq(salaInexistenteId), eq(TUTOR_UUID)))
                .thenThrow(new IllegalStateException("Sala não encontrada: " + salaInexistenteId));

        // Act & Assert (Executar e Validar)
        // Nota: requer handler de IllegalStateException → 404 no GlobalExceptionHandler (pendência Leonardo).
        mockMvc.perform(get("/api/v1/rooms/" + salaInexistenteId + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET - Deve retornar somente critérios da sala requisitada, sem vazar critérios de outra sala")
    void getCriteria_RetornaApenasCriteriosDaSala_SemVazamento() throws Exception {
        // Arrange (Preparar)
        List<CriterionResponse> criterioDaSala = List.of(
                new CriterionResponse("crit-A1", "Critério da Sala A", "Descrição", 2.0, "ACTIVE")
        );
        Mockito.when(performanceTableService.getCriteriaByRoom(eq(ROOM_UUID), eq(TUTOR_UUID)))
                .thenReturn(criterioDaSala);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + ROOM_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                // Critério da outra sala (crit-B1) não deve aparecer
                .andExpect(jsonPath("$[?(@.criterionId == 'crit-B1')]").isEmpty());
    }

    // =========================================================================
    // DELETE /api/v1/rooms/{roomId}/criteria/{criterionId} — REMOVER CRITÉRIO
    // =========================================================================

    @Test
    @DisplayName("DELETE - Tutor da sala: deve remover critério e retornar 204 (No Content)")
    void deleteCriterion_TutorDaSala_Returns204() throws Exception {
        // Arrange (Preparar)
        doNothing().when(performanceTableService).deleteCriterionFromRoom(eq(ROOM_UUID), eq(CRITERION_UUID), eq(TUTOR_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + ROOM_UUID + "/criteria/" + CRITERION_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isNoContent());

        verify(performanceTableService, Mockito.times(1))
                .deleteCriterionFromRoom(eq(ROOM_UUID), eq(CRITERION_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("DELETE - Sem token: deve retornar 401 (Unauthorized)")
    void deleteCriterion_SemToken_Returns401() throws Exception {
        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + ROOM_UUID + "/criteria/" + CRITERION_UUID))
                .andExpect(status().isUnauthorized());

        verify(performanceTableService, never()).deleteCriterionFromRoom(any(), any(), any());
    }

    @Test
    @DisplayName("DELETE - Tutor de OUTRA sala (IDOR): deve retornar 403 e banco intacto")
    void deleteCriterion_TutorDeOutraSala_Returns403() throws Exception {
        // Arrange (Preparar)
        doThrow(new SecurityException("Apenas o tutor responsável pela sala pode remover critérios."))
                .when(performanceTableService).deleteCriterionFromRoom(eq(ROOM_UUID), eq(CRITERION_UUID), eq(OTHER_TUTOR_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + ROOM_UUID + "/criteria/" + CRITERION_UUID)
                        .with(jwt().jwt(j -> j.subject(OTHER_TUTOR_UUID))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE - Aluno membro da sala: deve retornar 403 e banco intacto")
    void deleteCriterion_AlunoMembro_Returns403() throws Exception {
        // Arrange (Preparar)
        doThrow(new SecurityException("Apenas o tutor responsável pela sala pode remover critérios."))
                .when(performanceTableService).deleteCriterionFromRoom(eq(ROOM_UUID), eq(CRITERION_UUID), eq(STUDENT_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + ROOM_UUID + "/criteria/" + CRITERION_UUID)
                        .with(jwt().jwt(j -> j.subject(STUDENT_UUID))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("DELETE - Sala inexistente: deve retornar 404 (Not Found)")
    void deleteCriterion_SalaInexistente_Returns404() throws Exception {
        // Arrange (Preparar)
        String salaInexistenteId = "sala-inexistente-uuid";
        doThrow(new IllegalStateException("Sala não encontrada: " + salaInexistenteId))
                .when(performanceTableService).deleteCriterionFromRoom(eq(salaInexistenteId), eq(CRITERION_UUID), eq(TUTOR_UUID));

        // Act & Assert (Executar e Validar)
        // Nota: requer handler de IllegalStateException → 404 no GlobalExceptionHandler (pendência Leonardo).
        mockMvc.perform(delete("/api/v1/rooms/" + salaInexistenteId + "/criteria/" + CRITERION_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE - Critério inexistente: deve retornar 400 (Bad Request)")
    void deleteCriterion_CriterioInexistente_Returns400() throws Exception {
        // Arrange (Preparar)
        doThrow(new IllegalArgumentException("Critério não encontrado: crit-inexistente"))
                .when(performanceTableService).deleteCriterionFromRoom(eq(ROOM_UUID), eq("crit-inexistente"), eq(TUTOR_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + ROOM_UUID + "/criteria/crit-inexistente")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Critério não encontrado: crit-inexistente"));
    }

    @Test
    @DisplayName("DELETE - Critério que pertence a outra sala: deve ser rejeitado e critério preservado")
    void deleteCriterion_CriterioDeOutraSala_Returns400ECriterioPreservado() throws Exception {
        // Arrange (Preparar)
        doThrow(new IllegalArgumentException("O critério informado não pertence a esta sala."))
                .when(performanceTableService).deleteCriterionFromRoom(eq(ROOM_UUID), eq("crit-outra-sala"), eq(TUTOR_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + ROOM_UUID + "/criteria/crit-outra-sala")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("O critério informado não pertence a esta sala."));
    }

    // =========================================================================
    // FORA DE ESCOPO DO CARD /salas/{id}/criterios
    // =========================================================================

    @Test
    @Disabled("Fora do escopo do card /salas/{id}/criterios: edição de tabelas e critérios (PUT/PATCH)")
    @DisplayName("Contrato futuro: Deve atualizar dados via PUT /api/v1/rooms/{roomId}/criteria/{criterionId}")
    void updateCriterion_PutMethod_ForaDoEscopo() throws Exception {
        mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/rooms/" + ROOM_UUID + "/criteria/" + CRITERION_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"criteriaName\": \"Novo Nome\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @Disabled("Fora do escopo do card /salas/{id}/criterios: ativação/desativação de critérios (PATCH /status)")
    @DisplayName("Contrato futuro: Deve ativar/desativar critério via PATCH /api/v1/rooms/{roomId}/criteria/{criterionId}/status")
    void toggleCriterionStatus_PatchMethod_ForaDoEscopo() throws Exception {
        mockMvc.perform(
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .patch("/api/v1/rooms/" + ROOM_UUID + "/criteria/" + CRITERION_UUID + "/status")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"INACTIVE\"}"))
                .andExpect(status().isOk());
    }
}
