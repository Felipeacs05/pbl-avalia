
package com.uefs.tfs.avaliasystem.US08;

import com.uefs.tfs.avaliasystem.Security.PerformanceTableSecurity;
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
import org.springframework.security.core.Authentication;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

    @MockitoBean(name = "performanceTableSecurity")
    private PerformanceTableSecurity performanceTableSecurity;

    private static final String TUTOR_UUID =
            "123e4567-e89b-12d3-a456-426614174000";

    private static final String OTHER_USER_UUID =
            "999e4567-e89b-12d3-a456-426614174999";

    private static final UUID ROOM_UUID =
            UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    private static final UUID TABLE_UUID =
            UUID.fromString("771a3400-e29b-41d4-b825-112233445566");

    private static final UUID CONTENT_UUID =
            UUID.fromString("881a3400-e29b-41d4-b825-112233445561");

    private static final UUID PARTICIPATION_UUID =
            UUID.fromString("881a3400-e29b-41d4-b825-112233445562");

    private static final UUID SELF_ASSESSMENT_UUID =
            UUID.fromString("881a3400-e29b-41d4-b825-112233445563");

    // -------------------------------------------------------
    // ALTERAÇÃO DOS PESOS (PUT)
    // -------------------------------------------------------

    @Test
    @DisplayName("Deve encaminhar os pesos ao Service e retornar 200 OK")
    void updateCriteriaWeights_WithValidWeights_Returns200()
            throws Exception {

        // Arrange
        CriteriaWeightsRequest request =
                weightsRequest(0.6, 0.3, 0.1);

        PerformanceTableResponse expectedResponse =
                new PerformanceTableResponse(
                        TABLE_UUID,
                        ROOM_UUID,
                        "Tabela Padrão",
                        "ACTIVE",
                        List.of(
                                new CriterionResponse(
                                        CONTENT_UUID,
                                        "Conteúdo",
                                        null,
                                        0.6,
                                        "ACTIVE"
                                ),
                                new CriterionResponse(
                                        PARTICIPATION_UUID,
                                        "Participação",
                                        null,
                                        0.3,
                                        "ACTIVE"
                                ),
                                new CriterionResponse(
                                        SELF_ASSESSMENT_UUID,
                                        "Autoavaliação",
                                        null,
                                        0.1,
                                        "ACTIVE"
                                )
                        )
                );

        Mockito.when(
                performanceTableSecurity.isOwner(
                        eq(TABLE_UUID),
                        any(Authentication.class)
                )
        ).thenReturn(true);

        Mockito.when(
                performanceTableService.updateCriteriaWeights(
                        eq(TABLE_UUID),
                        any(CriteriaWeightsRequest.class),
                        eq(UUID.fromString(TUTOR_UUID))
                )
        ).thenReturn(expectedResponse);

        // Act & Assert
        mockMvc.perform(
                        put("/api/v1/performance-tables/"
                                + TABLE_UUID + "/criteria/weights")
                                .with(jwt().jwt(
                                        j -> j.subject(TUTOR_UUID)
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(request)
                                )
                )
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$.performanceTableId")
                                .value(TABLE_UUID.toString())
                )
                .andExpect(
                        jsonPath("$.criteriaList[2].criterionId")
                                .value(SELF_ASSESSMENT_UUID.toString())
                )
                .andExpect(
                        jsonPath("$.criteriaList[2].criteriaWeight")
                                .value(0.1)
                );

        verify(performanceTableService, Mockito.times(1))
                .updateCriteriaWeights(
                        eq(TABLE_UUID),
                        argThat(r ->
                                r.getWeights().size() == 3
                                        && SELF_ASSESSMENT_UUID.equals(
                                                r.getWeights()
                                                        .get(2)
                                                        .getCriterionId()
                                        )
                                        && Double.valueOf(0.1).equals(
                                                r.getWeights()
                                                        .get(2)
                                                        .getCriteriaWeight()
                                        )
                        ),
                        eq(UUID.fromString(TUTOR_UUID))
                );
    }

    @Test
    @DisplayName("[QA] Deve retornar 422 quando a soma dos pesos não for 100%")
    void updateCriteriaWeights_WithInvalidSum_Returns422()
            throws Exception {

        // Arrange
        // 0.4 + 0.3 + 0.2 = 0.9
        CriteriaWeightsRequest request =
                weightsRequest(0.4, 0.3, 0.2);

        Mockito.when(
                performanceTableSecurity.isOwner(
                        eq(TABLE_UUID),
                        any(Authentication.class)
                )
        ).thenReturn(true);

        Mockito.when(
                performanceTableService.updateCriteriaWeights(
                        eq(TABLE_UUID),
                        any(CriteriaWeightsRequest.class),
                        eq(UUID.fromString(TUTOR_UUID))
                )
        ).thenThrow(
                new InvalidWeightSumException(
                        "A soma dos pesos deve ser exatamente 100% (1.0)."
                )
        );

        // Act & Assert
        mockMvc.perform(
                        put("/api/v1/performance-tables/"
                                + TABLE_UUID + "/criteria/weights")
                                .with(jwt().jwt(
                                        j -> j.subject(TUTOR_UUID)
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(request)
                                )
                )
                .andExpect(status().is(422))
                .andExpect(
                        jsonPath("$.message").value(
                                "A soma dos pesos deve ser exatamente 100% (1.0)."
                        )
                );
    }

    @Test
    @DisplayName("Deve retornar 403 quando usuário não é tutor da sala")
    void updateCriteriaWeights_WhenUserIsNotRoomTutor_Returns403()
            throws Exception {

        // Arrange
        CriteriaWeightsRequest request =
                weightsRequest(0.6, 0.3, 0.1);

        Mockito.when(
                performanceTableSecurity.isOwner(
                        eq(TABLE_UUID),
                        any(Authentication.class)
                )
        ).thenReturn(false);

        // Act & Assert
        mockMvc.perform(
                        put("/api/v1/performance-tables/"
                                + TABLE_UUID + "/criteria/weights")
                                .with(jwt().jwt(
                                        j -> j.subject(OTHER_USER_UUID)
                                ))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        objectMapper.writeValueAsString(request)
                                )
                )
                .andExpect(status().isForbidden());

        // O Service não deve ser executado para usuário sem permissão.
        verify(performanceTableService, never())
                .updateCriteriaWeights(
                        any(),
                        any(),
                        any()
                );
    }

    // -------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------

    private CriteriaWeightsRequest weightsRequest(
            double content,
            double participation,
            double selfAssessment
    ) {
        return new CriteriaWeightsRequest(
                List.of(
                        new CriterionWeightRequest(
                                CONTENT_UUID,
                                content
                        ),
                        new CriterionWeightRequest(
                                PARTICIPATION_UUID,
                                participation
                        ),
                        new CriterionWeightRequest(
                                SELF_ASSESSMENT_UUID,
                                selfAssessment
                        )
                )
        );
    }
}
