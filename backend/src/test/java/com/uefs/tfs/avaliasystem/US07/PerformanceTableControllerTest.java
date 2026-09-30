package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.PerformanceTableController;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
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
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PerformanceTableController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("US07 - Testes de Controller da Tabela de Desempenho e Critérios")
class PerformanceTableControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PerformanceTableService performanceTableService;

    private final String TUTOR_UUID = "123e4567-e89b-12d3-a456-426614174000";
    private final String OTHER_USER_UUID = "999e4567-e89b-12d3-a456-426614174999";
    private final String ROOM_UUID = "550e8400-e29b-41d4-a716-446655440000";
    private final String TABLE_UUID = "tbl-771a3400-e29b-41d4-b825-112233445566";

    // =========================================================================
    // TESTES EXISTENTES (PRESERVADOS CONFORME REGRAS)
    // =========================================================================

    @Test
    @DisplayName("Deve criar tabela de desempenho e critérios com sucesso retornando 201 (Created)")
    void createPerformanceTable_WithValidData_Returns201() throws Exception {
        CriterionRequest criterionReq = new CriterionRequest("Postura e Ética", "Comportamento em tutoria", 3.0);
        PerformanceTableRequest request = new PerformanceTableRequest(ROOM_UUID, "Tabela de Soft Skills", List.of(criterionReq));

        CriterionResponse criterionRes = new CriterionResponse("crit-01", "Postura e Ética", "Comportamento em tutoria", 3.0, "ACTIVE");
        PerformanceTableResponse expectedResponse = new PerformanceTableResponse(
                TABLE_UUID, ROOM_UUID, "Tabela de Soft Skills", "ACTIVE", List.of(criterionRes)
        );

        Mockito.when(performanceTableService.createPerformanceTable(any(PerformanceTableRequest.class), eq(TUTOR_UUID)))
                .thenReturn(expectedResponse);

        mockMvc.perform(post("/api/v1/performance-tables")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.performanceTableId").value(TABLE_UUID))
                .andExpect(jsonPath("$.tableName").value("Tabela de Soft Skills"))
                .andExpect(jsonPath("$.criteriaList[0].criteriaName").value("Postura e Ética"));

        verify(performanceTableService, Mockito.times(1))
                .createPerformanceTable(any(PerformanceTableRequest.class), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("Deve validar e bloquear a criação se criteriaName for vazio retornando 400 (Bad Request)")
    void createPerformanceTable_WithEmptyCriteriaName_Returns400() throws Exception {
        CriterionRequest criterionReq = new CriterionRequest("", "Descrição", 1.0);
        PerformanceTableRequest request = new PerformanceTableRequest(ROOM_UUID, "Tabela Válida", List.of(criterionReq));

        mockMvc.perform(post("/api/v1/performance-tables")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(performanceTableService, never()).createPerformanceTable(any(), any());
    }

    @Test
    @DisplayName("Deve validar e bloquear inclusão de critérios contendo caracteres especiais inválidos retornando 400")
    void createPerformanceTable_WithDisallowedSpecialCharacters_Returns400() throws Exception {
        CriterionRequest criterionReq = new CriterionRequest("<script>alert('XSS')</script> *#;", "Tentativa de injeção", 1.0);
        PerformanceTableRequest request = new PerformanceTableRequest(ROOM_UUID, "Tabela Válida", List.of(criterionReq));

        mockMvc.perform(post("/api/v1/performance-tables")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(performanceTableService, never()).createPerformanceTable(any(), any());
    }

    @Test
    @DisplayName("Deve bloquear requisição de usuário não autenticado retornando 401 (Unauthorized)")
    void createPerformanceTable_WithoutAuth_Returns401() throws Exception {
        CriterionRequest criterionReq = new CriterionRequest("Postura", "Descrição", 2.0);
        PerformanceTableRequest request = new PerformanceTableRequest(ROOM_UUID, "Tabela", List.of(criterionReq));

        mockMvc.perform(post("/api/v1/performance-tables")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verify(performanceTableService, never()).createPerformanceTable(any(), any());
    }

    @Test
    @DisplayName("Deve adicionar critério individual a uma tabela existente com sucesso retornando 201")
    void addCriterion_WithValidData_Returns201() throws Exception {
        CriterionRequest criterionReq = new CriterionRequest("Raciocínio Lógico", "Resolução de problemas", 5.0);
        CriterionResponse expectedResponse = new CriterionResponse("crit-02", "Raciocínio Lógico", "Resolução de problemas", 5.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterion(eq(TABLE_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(expectedResponse);

        mockMvc.perform(post("/api/v1/performance-tables/" + TABLE_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(criterionReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criterionId").value("crit-02"))
                .andExpect(jsonPath("$.criteriaName").value("Raciocínio Lógico"));

        verify(performanceTableService, Mockito.times(1))
                .addCriterion(eq(TABLE_UUID), any(CriterionRequest.class), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("Deve remover critério existente com sucesso retornando 204 (No Content)")
    void deleteCriterion_WhenExists_Returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/performance-tables/" + TABLE_UUID + "/criteria/crit-01")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isNoContent());

        verify(performanceTableService, Mockito.times(1))
                .deleteCriterion(eq(TABLE_UUID), eq("crit-01"), eq(TUTOR_UUID));
    }

    // =========================================================================
    // NOVOS TESTES: VALIDAÇÕES INVÁLIDAS REUTILIZÁVEIS EM POST /criteria (ITEM A)
    // =========================================================================

    @ParameterizedTest(name = "[{index}] Rejeição no POST /criteria para: {0}")
    @MethodSource("com.uefs.tfs.avaliasystem.US07.InvalidCriterionPayloads#provideInvalidCriterionRequests")
    @DisplayName("Deve validar DTO e bloquear adição de critério com payload inválido retornando 400 (Bad Request)")
    void addCriterion_WithInvalidPayloads_Returns400(String scenario, CriterionRequest invalidRequest) throws Exception {
        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/" + TABLE_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors").isMap());

        verify(performanceTableService, never()).addCriterion(any(), any(), any());
    }

    @Test
    @DisplayName("Deve aceitar critério com nome no limite máximo de 255 caracteres retornando 201")
    void addCriterion_WithNameWith255Characters_Returns201() throws Exception {
        // Arrange (Preparar)
        String maxValidName = "A".repeat(255);
        CriterionRequest request = new CriterionRequest(maxValidName, "Descrição de borda máxima", 1.0);
        CriterionResponse response = new CriterionResponse("crit-max", maxValidName, "Descrição de borda máxima", 1.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterion(eq(TABLE_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/" + TABLE_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value(maxValidName));
    }

    // =========================================================================
    // NOVOS TESTES: AUTORIZAÇÃO E CONTROLE DE ACESSO RBAC (ITEM C)
    // =========================================================================

    @Test
    @DisplayName("Deve retornar 403 (Forbidden) ao tentar adicionar critério por usuário sem permissão de tutor da sala")
    void addCriterion_WhenUserIsNotRoomTutor_Returns403() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Postura", "Ética", 2.0);
        Mockito.when(performanceTableService.addCriterion(eq(TABLE_UUID), any(CriterionRequest.class), eq(OTHER_USER_UUID)))
                .thenThrow(new SecurityException("Apenas o tutor responsável pela sala pode gerenciar critérios."));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/" + TABLE_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(OTHER_USER_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Deve retornar 403 (Forbidden) ao tentar remover critério por usuário sem permissão de tutor da sala")
    void deleteCriterion_WhenUserIsNotRoomTutor_Returns403() throws Exception {
        // Arrange (Preparar)
        doThrow(new SecurityException("Apenas o tutor responsável pela sala pode remover critérios."))
                .when(performanceTableService).deleteCriterion(eq(TABLE_UUID), eq("crit-01"), eq(OTHER_USER_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/performance-tables/" + TABLE_UUID + "/criteria/crit-01")
                        .with(jwt().jwt(j -> j.subject(OTHER_USER_UUID))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("BUG: Deve retornar 403 (Forbidden) ao consultar tabela por usuário sem vínculo com a sala")
    void getPerformanceTable_WhenUserHasNoLinkToRoom_Returns403() throws Exception {
        // Arrange (Preparar)
        // O endpoint GET /{id} na implementação atual não recebe Principal nem checa vínculo da sala.
        // O teste é escrito com a expectativa correta de segurança (RBAC) exigida no contrato (403 Forbidden).
        // Se a aplicação responder 200 OK, a falha comprova vulnerabilidade de quebra de controle de acesso (IDOR).
        PerformanceTableResponse response = new PerformanceTableResponse(
                TABLE_UUID, ROOM_UUID, "Tabela de Tutoria", "ACTIVE", List.of()
        );
        Mockito.when(performanceTableService.getPerformanceTable(TABLE_UUID)).thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/performance-tables/" + TABLE_UUID)
                        .with(jwt().jwt(j -> j.subject(OTHER_USER_UUID))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // NOVOS TESTES: BORDAS DE NEGÓCIO E LIMITES (ITEM D)
    // =========================================================================

    @Test
    @DisplayName("Deve retornar 400 (Bad Request) ao tentar adicionar critério em tabela inexistente")
    void addCriterion_WhenTableNotFound_Returns400() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Liderança", "Proatividade", 1.0);
        Mockito.when(performanceTableService.addCriterion(eq("tabela-inexistente"), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenThrow(new IllegalArgumentException("Tabela de desempenho não encontrada: tabela-inexistente"));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/tabela-inexistente/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Tabela de desempenho não encontrada: tabela-inexistente"));
    }

    @Test
    @DisplayName("Deve retornar 400 (Bad Request) ao tentar remover critério de tabela inexistente")
    void deleteCriterion_WhenTableNotFound_Returns400() throws Exception {
        // Arrange (Preparar)
        doThrow(new IllegalArgumentException("Tabela de desempenho não encontrada: tabela-inexistente"))
                .when(performanceTableService).deleteCriterion(eq("tabela-inexistente"), eq("crit-01"), eq(TUTOR_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/performance-tables/tabela-inexistente/criteria/crit-01")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Tabela de desempenho não encontrada: tabela-inexistente"));
    }

    @Test
    @DisplayName("Deve retornar 400 (Bad Request) ao tentar remover critério inexistente")
    void deleteCriterion_WhenCriterionNotFound_Returns400() throws Exception {
        // Arrange (Preparar)
        doThrow(new IllegalArgumentException("Critério não encontrado: crit-inexistente"))
                .when(performanceTableService).deleteCriterion(eq(TABLE_UUID), eq("crit-inexistente"), eq(TUTOR_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/performance-tables/" + TABLE_UUID + "/criteria/crit-inexistente")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Critério não encontrado: crit-inexistente"));
    }

    @Test
    @DisplayName("Deve retornar 400 (Bad Request) ao tentar remover critério que pertence a outra tabela")
    void deleteCriterion_WhenCriterionBelongsToAnotherTable_Returns400() throws Exception {
        // Arrange (Preparar)
        doThrow(new IllegalArgumentException("O critério informado não pertence a esta tabela de desempenho."))
                .when(performanceTableService).deleteCriterion(eq(TABLE_UUID), eq("crit-outra-tabela"), eq(TUTOR_UUID));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/performance-tables/" + TABLE_UUID + "/criteria/crit-outra-tabela")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("O critério informado não pertence a esta tabela de desempenho."));
    }

    @Test
    @DisplayName("Deve retornar 400 (Bad Request) se criteriaList for enviada vazia na criação da tabela")
    void createPerformanceTable_WhenCriteriaListIsEmpty_Returns400() throws Exception {
        // Arrange (Preparar)
        PerformanceTableRequest request = new PerformanceTableRequest(ROOM_UUID, "Tabela Sem Critérios", List.of());

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.criteriaList").value("A lista de critérios não pode estar vazia"));

        verify(performanceTableService, never()).createPerformanceTable(any(), any());
    }

    @Test
    @DisplayName("Deve permitir e retornar 201 ao cadastrar critério com nome formado apenas por hífens")
    void addCriterion_WhenNameHasOnlyHyphens_Returns201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("---", "Separador", 1.0);
        CriterionResponse response = new CriterionResponse("crit-hyphen", "---", "Separador", 1.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterion(eq(TABLE_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/" + TABLE_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("---"));
    }

    @Test
    @DisplayName("Deve permitir e retornar 201 ao cadastrar critério com caracteres acentuados da língua portuguesa")
    void addCriterion_WhenNameHasAccents_Returns201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Raciocínio Lógico e Dedução", "Capacidade analítica", 4.0);
        CriterionResponse response = new CriterionResponse("crit-accent", "Raciocínio Lógico e Dedução", "Capacidade analítica", 4.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterion(eq(TABLE_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/" + TABLE_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("Raciocínio Lógico e Dedução"));
    }

    @Test
    @DisplayName("Deve aceitar peso zero (0.0) na adição do critério retornando 201 (Created)")
    void addCriterion_WhenWeightIsZero_Returns201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Critério Opcional", "Sem pontuação direta", 0.0);
        CriterionResponse response = new CriterionResponse("crit-zero", "Critério Opcional", "Sem pontuação direta", 0.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterion(eq(TABLE_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/" + TABLE_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(0.0));
    }

    @Test
    @DisplayName("Deve aplicar peso padrão 1.0 quando omitido no corpo da requisição retornando 201")
    void addCriterion_WhenWeightIsOmitted_Returns201WithDefaultWeight() throws Exception {
        // Arrange (Preparar)
        String jsonWithoutWeight = "{\"criteriaName\": \"Participação\", \"criteriaDescription\": \"Presença ativa\"}";
        CriterionResponse response = new CriterionResponse("crit-def", "Participação", "Presença ativa", 1.0, "ACTIVE");

        Mockito.when(performanceTableService.addCriterion(eq(TABLE_UUID), any(CriterionRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/performance-tables/" + TABLE_UUID + "/criteria")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithoutWeight))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(1.0));
    }

    // =========================================================================
    // ITENS E & F: LACUNAS DE NEGÓCIO NÃO IMPLEMENTADAS (@Disabled)
    // =========================================================================

    @Test
    @Disabled("US07 - funcionalidade não implementada: edição de tabelas e critérios (PUT/PATCH)")
    @DisplayName("Contrato esperado: Deve atualizar dados da tabela via PUT /api/v1/performance-tables/{id} retornando 200")
    void updatePerformanceTable_WhenPutMethodCalled_ExpectContract() throws Exception {
        // Contrato esperado: PUT /api/v1/performance-tables/{id}
        mockMvc.perform(put("/api/v1/performance-tables/" + TABLE_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tableName\": \"Novo Nome Atualizado\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @Disabled("US07 - funcionalidade não implementada: seleção/ativação de critérios")
    @DisplayName("Contrato esperado: Deve ativar/desativar critério via PATCH /api/v1/performance-tables/{id}/criteria/{critId}/status")
    void toggleCriterionActiveStatus_WhenEndpointCalled_ExpectContract() throws Exception {
        // Contrato esperado: PATCH /api/v1/performance-tables/{tableId}/criteria/{criterionId}/status
        mockMvc.perform(patch("/api/v1/performance-tables/" + TABLE_UUID + "/criteria/crit-01/status")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"INACTIVE\"}"))
                .andExpect(status().isOk());
    }
}
