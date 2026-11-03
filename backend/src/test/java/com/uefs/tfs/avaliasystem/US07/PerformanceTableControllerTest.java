package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.PerformanceTableController;
import com.uefs.tfs.avaliasystem.dto.CriteriaWeightsRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.CriterionWeightRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidWeightSumException;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.security.PerformanceTableSecurity;
import com.uefs.tfs.avaliasystem.service.PerformanceTableService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PerformanceTableController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("US07 - Testes do controller de critérios da tabela")
class PerformanceTableControllerTest {

    private static final UUID TABLE_ID =
            UUID.fromString("771a3400-e29b-41d4-b825-112233445566");
    private static final UUID ROOM_ID =
            UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID CRITERION_ID =
            UUID.fromString("881a3400-e29b-41d4-b825-112233445566");
    private static final UUID SECOND_CRITERION_ID =
            UUID.fromString("881a3400-e29b-41d4-b825-112233445567");
    private static final UUID TUTOR_ID =
            UUID.fromString("123e4567-e89b-12d3-a456-426614174000");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private PerformanceTableService performanceTableService;

    @MockitoBean(name = "performanceTableSecurity")
    private PerformanceTableSecurity performanceTableSecurity;

    @Test
    @DisplayName("POST - Deve adicionar critério à tabela e retornar 201")
    void addCriterion_Returns201() throws Exception {
        CriterionRequest request =
                new CriterionRequest("Postura e Ética", "Comportamento", 0.25);
        CriterionResponse response = new CriterionResponse(
                CRITERION_ID,
                "Postura e Ética",
                "Comportamento",
                0.25,
                "ACTIVE"
        );

        Mockito.when(performanceTableService.addCriterion(
                eq(TABLE_ID),
                any(CriterionRequest.class),
                eq(TUTOR_ID)
        )).thenReturn(response);

        mockMvc.perform(post("/api/v1/performance-tables/"
                        + TABLE_ID + "/criteria")
                        .with(jwt().jwt(jwt -> jwt.subject(TUTOR_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criterionId").value(CRITERION_ID.toString()))
                .andExpect(jsonPath("$.criteriaWeight").value(0.25));

        verify(performanceTableService).addCriterion(
                eq(TABLE_ID),
                any(CriterionRequest.class),
                eq(TUTOR_ID)
        );
    }

    @Test
    @DisplayName("POST - Sem autenticação deve retornar 401")
    void addCriterion_WithoutAuthentication_Returns401() throws Exception {
        CriterionRequest request =
                new CriterionRequest("Postura", "Comportamento", 1.0);

        mockMvc.perform(post("/api/v1/performance-tables/"
                        + TABLE_ID + "/criteria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verify(performanceTableService, never())
                .addCriterion(any(), any(), any());
    }

    @ParameterizedTest(name = "[{index}] Deve rejeitar: {0}")
    @MethodSource("com.uefs.tfs.avaliasystem.US07.InvalidCriterionPayloads#provideInvalidCriterionRequests")
    @DisplayName("POST - Deve rejeitar payloads inválidos antes de chamar o service")
    void addCriterion_InvalidPayload_Returns400(
            String scenario,
            CriterionRequest request
    ) throws Exception {
        mockMvc.perform(post("/api/v1/performance-tables/"
                        + TABLE_ID + "/criteria")
                        .with(jwt().jwt(jwt -> jwt.subject(TUTOR_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors").isMap());

        verify(performanceTableService, never())
                .addCriterion(any(), any(), any());
    }

    @Test
    @DisplayName("POST - Peso acima de 1 deve retornar 422")
    void addCriterion_WeightAboveOne_Returns422() throws Exception {
        CriterionRequest request =
                new CriterionRequest("Postura", "Comportamento", 1.1);
        Mockito.when(performanceTableService.addCriterion(
                eq(TABLE_ID),
                any(CriterionRequest.class),
                eq(TUTOR_ID)
        )).thenThrow(new InvalidWeightSumException(
                "O peso deve estar entre 0 e 1."
        ));

        mockMvc.perform(post("/api/v1/performance-tables/"
                        + TABLE_ID + "/criteria")
                        .with(jwt().jwt(jwt -> jwt.subject(TUTOR_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(
                        "O peso deve estar entre 0 e 1."
                ));
    }

    @Test
    @DisplayName("GET - Deve retornar a tabela e seus critérios")
    void getPerformanceTable_ReturnsTable() throws Exception {
        PerformanceTableResponse response = new PerformanceTableResponse(
                TABLE_ID,
                ROOM_ID,
                "Tabela da sala",
                "ACTIVE",
                List.of(new CriterionResponse(
                        CRITERION_ID,
                        "Postura e Ética",
                        "Comportamento",
                        1.0,
                        "ACTIVE"
                ))
        );
        Mockito.when(performanceTableService.getPerformanceTable(TABLE_ID))
                .thenReturn(response);

        mockMvc.perform(get("/api/v1/performance-tables/" + TABLE_ID)
                        .with(jwt().jwt(jwt -> jwt.subject(TUTOR_ID.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.performanceTableId")
                        .value(TABLE_ID.toString()))
                .andExpect(jsonPath("$.roomId").value(ROOM_ID.toString()))
                .andExpect(jsonPath("$.criteriaList.length()").value(1))
                .andExpect(jsonPath("$.criteriaList[0].criterionId")
                        .value(CRITERION_ID.toString()));
    }

    @Test
    @DisplayName("DELETE - Deve remover critério e retornar 204")
    void deleteCriterion_Returns204() throws Exception {
        mockMvc.perform(delete("/api/v1/performance-tables/"
                        + TABLE_ID + "/criteria/" + CRITERION_ID)
                        .with(jwt().jwt(jwt -> jwt.subject(TUTOR_ID.toString()))))
                .andExpect(status().isNoContent());

        verify(performanceTableService).deleteCriterion(
                TABLE_ID,
                CRITERION_ID,
                TUTOR_ID
        );
    }

    @Test
    @DisplayName("DELETE - Sem autenticação deve retornar 401")
    void deleteCriterion_WithoutAuthentication_Returns401() throws Exception {
        mockMvc.perform(delete("/api/v1/performance-tables/"
                        + TABLE_ID + "/criteria/" + CRITERION_ID))
                .andExpect(status().isUnauthorized());

        verify(performanceTableService, never())
                .deleteCriterion(any(), any(), any());
    }

    @Test
    @DisplayName("PUT - Deve encaminhar os pesos e retornar a tabela atualizada")
    void updateCriteriaWeights_Returns200() throws Exception {
        Mockito.when(performanceTableSecurity.isOwner(
                eq(TABLE_ID),
                any(Authentication.class)
        )).thenReturn(true);

        CriteriaWeightsRequest request = new CriteriaWeightsRequest(List.of(
                new CriterionWeightRequest(CRITERION_ID, 0.75),
                new CriterionWeightRequest(SECOND_CRITERION_ID, 0.25)
        ));
        PerformanceTableResponse response = new PerformanceTableResponse(
                TABLE_ID,
                ROOM_ID,
                "Tabela da sala",
                "ACTIVE",
                List.of(
                        new CriterionResponse(
                                CRITERION_ID,
                                "Postura",
                                null,
                                0.75,
                                "ACTIVE"
                        ),
                        new CriterionResponse(
                                SECOND_CRITERION_ID,
                                "Participação",
                                null,
                                0.25,
                                "ACTIVE"
                        )
                )
        );
        Mockito.when(performanceTableService.updateCriteriaWeights(
                eq(TABLE_ID),
                any(CriteriaWeightsRequest.class),
                eq(TUTOR_ID)
        )).thenReturn(response);

        mockMvc.perform(put("/api/v1/performance-tables/"
                        + TABLE_ID + "/criteria/weights")
                        .with(jwt().jwt(jwt -> jwt.subject(TUTOR_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.criteriaList[0].criteriaWeight")
                        .value(0.75))
                .andExpect(jsonPath("$.criteriaList[1].criteriaWeight")
                        .value(0.25));
    }

    @Test
    @DisplayName("PUT - Usuário que não é tutor deve receber 403")
    void updateCriteriaWeights_NonOwner_Returns403() throws Exception {
        Mockito.when(performanceTableSecurity.isOwner(
                eq(TABLE_ID),
                any(Authentication.class)
        )).thenReturn(false);

        CriteriaWeightsRequest request = new CriteriaWeightsRequest(List.of(
                new CriterionWeightRequest(CRITERION_ID, 1.0)
        ));

        mockMvc.perform(put("/api/v1/performance-tables/"
                        + TABLE_ID + "/criteria/weights")
                        .with(jwt().jwt(jwt -> jwt.subject(TUTOR_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(performanceTableService, never())
                .updateCriteriaWeights(any(), any(), any());
    }
}
