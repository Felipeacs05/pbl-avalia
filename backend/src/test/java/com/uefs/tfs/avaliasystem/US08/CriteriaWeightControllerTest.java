package com.uefs.tfs.avaliasystem.US08;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.PerformanceTableController;
import com.uefs.tfs.avaliasystem.dto.CriteriaWeightsRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.CriterionWeightRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidWeightSumException;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Fatia da camada web apenas (rota, JSON e mapeamento de exceções); o Service é mockado.
// A SecurityConfig real é importada, então o "sub" do JWT é o que chega em principal.getName()
// O @WebMvcTest marca para o spring qual deve ser o controller testado e injetado
@WebMvcTest(PerformanceTableController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("US08 - Testes de Controller dos pesos dos critérios")
class CriteriaWeightControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PerformanceTableService performanceTableService;

    private final String TUTOR_UUID = "123e4567-e89b-12d3-a456-426614174000";
    private final String OTHER_USER_UUID = "999e4567-e89b-12d3-a456-426614174999";
    private final UUID ROOM_UUID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private final UUID TABLE_UUID = UUID.fromString("771a3400-e29b-41d4-b825-112233445566");
    private final UUID CONTENT_UUID = UUID.fromString("881a3400-e29b-41d4-b825-112233445561");
    private final UUID PARTICIPATION_UUID = UUID.fromString("881a3400-e29b-41d4-b825-112233445562");
    private final UUID SELF_ASSESSMENT_UUID = UUID.fromString("881a3400-e29b-41d4-b825-112233445563");

    // --- ALTERAÇÃO DOS PESOS (PUT) ---

    @Test
    @DisplayName("Deve encaminhar os pesos ao Service e retornar 200 (OK) com a tabela atualizada")
    void updateCriteriaWeights_WithValidWeights_Returns200() throws Exception {
        // Arrange (Preparar)
        CriteriaWeightsRequest request = weightsRequest(0.6, 0.3, 0.1);
        PerformanceTableResponse expectedResponse = new PerformanceTableResponse(
                TABLE_UUID, ROOM_UUID, "Tabela Padrão", "ACTIVE", List.of(
                        new CriterionResponse(CONTENT_UUID, "Conteúdo", null, 0.6, "ACTIVE"),
                        new CriterionResponse(PARTICIPATION_UUID, "Participação", null, 0.3, "ACTIVE"),
                        new CriterionResponse(SELF_ASSESSMENT_UUID, "Autoavaliação", null, 0.1, "ACTIVE")));

        Mockito.when(performanceTableService.updateCriteriaWeights(eq(TABLE_UUID), any(CriteriaWeightsRequest.class), eq(TUTOR_UUID)))
                .thenReturn(expectedResponse);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(put("/api/v1/performance-tables/" + TABLE_UUID + "/criteria/weights")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.performanceTableId").value(TABLE_UUID.toString()))
                .andExpect(jsonPath("$.criteriaList[2].criterionId").value(SELF_ASSESSMENT_UUID.toString()))
                .andExpect(jsonPath("$.criteriaList[2].criteriaWeight").value(0.1));

        // O corpo desserializado, a variável de caminho e o usuário autenticado precisam chegar ao Service
        //verifica se o controller enviou os parâmetros corretos para o service e se o service recebeu corretamente
        verify(performanceTableService, Mockito.times(1)).updateCriteriaWeights(
                eq(TABLE_UUID),
                argThat(r -> r.getWeights().size() == 3
                        && SELF_ASSESSMENT_UUID.equals(r.getWeights().get(2).getCriterionId())
                        && Double.valueOf(0.1).equals(r.getWeights().get(2).getCriteriaWeight())),
                eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[QA] Deve retornar 422 (Unprocessable Entity) com a mensagem quando a soma dos pesos for diferente de 100%")
    void updateCriteriaWeights_WithInvalidSum_Returns422() throws Exception {
        // Arrange (Preparar)
        // 0.4 + 0.3 + 0.2 = 90%; a regra da soma é do Service, aqui se valida o mapeamento exceção -> 422
        CriteriaWeightsRequest request = weightsRequest(0.4, 0.3, 0.2);
        Mockito.when(performanceTableService.updateCriteriaWeights(eq(TABLE_UUID), any(CriteriaWeightsRequest.class), eq(TUTOR_UUID)))
                .thenThrow(new InvalidWeightSumException("A soma dos pesos deve ser exatamente 100% (1.0)."));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(put("/api/v1/performance-tables/" + TABLE_UUID + "/criteria/weights")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is(422))
                // A mensagem chega ao corpo para a interface explicar por que o salvamento foi bloqueado
                .andExpect(jsonPath("$.message").value("A soma dos pesos deve ser exatamente 100% (1.0)."));
    }

    @Test
    @DisplayName("Deve retornar 403 (Forbidden) ao alterar pesos por usuário que não é tutor da sala")
    void updateCriteriaWeights_WhenUserIsNotRoomTutor_Returns403() throws Exception {
        // Arrange (Preparar)
        CriteriaWeightsRequest request = weightsRequest(0.6, 0.3, 0.1);
        Mockito.when(performanceTableService.updateCriteriaWeights(eq(TABLE_UUID), any(CriteriaWeightsRequest.class), eq(OTHER_USER_UUID)))
                .thenThrow(new SecurityException("Apenas o tutor responsável pela sala pode gerenciar critérios."));

        // Act & Assert (Executar e Validar)
        mockMvc.perform(put("/api/v1/performance-tables/" + TABLE_UUID + "/criteria/weights")
                        .with(jwt().jwt(j -> j.subject(OTHER_USER_UUID)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    // Helpers

    private CriteriaWeightsRequest weightsRequest(double content, double participation, double selfAssessment) {
        return new CriteriaWeightsRequest(List.of(
                new CriterionWeightRequest(CONTENT_UUID, content),
                new CriterionWeightRequest(PARTICIPATION_UUID, participation),
                new CriterionWeightRequest(SELF_ASSESSMENT_UUID, selfAssessment)));
    }
}
