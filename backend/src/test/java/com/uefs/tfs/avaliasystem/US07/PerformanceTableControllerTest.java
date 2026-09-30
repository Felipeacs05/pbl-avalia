package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.PerformanceTableController;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
import com.uefs.tfs.avaliasystem.service.PerformanceTableService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    private final String ROOM_UUID = "550e8400-e29b-41d4-a716-446655440000";
    private final String TABLE_UUID = "tbl-771a3400-e29b-41d4-b825-112233445566";

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
}
