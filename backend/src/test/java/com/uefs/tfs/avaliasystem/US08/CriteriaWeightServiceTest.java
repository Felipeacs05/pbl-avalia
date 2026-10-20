package com.uefs.tfs.avaliasystem.US08;

import com.uefs.tfs.avaliasystem.dto.CriteriaWeightsRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.CriterionWeightRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidWeightSumException;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.service.PerformanceTableService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

// Teste unitário puro: repositórios mockados, sem contexto Spring e sem banco
@ExtendWith(MockitoExtension.class)
@DisplayName("US08 - Testes de Regra de Negócio (Service) dos pesos dos critérios")
class CriteriaWeightServiceTest {

    @InjectMocks
    private PerformanceTableService performanceTableService;

    @Mock
    private PerformanceTableRepository performanceTableRepository;

    @Mock
    private CriterionRepository criterionRepository;

    @Mock
    private RoomRepository roomRepository;

    // Captura a tabela que o service tentou salvar para inspecionar os pesos gravados
    @Captor
    private ArgumentCaptor<PerformanceTable> tableCaptor;

    private final String TUTOR_UUID = "123e4567-e89b-12d3-a456-426614174000";
    private final String OTHER_USER_UUID = "999e4567-e89b-12d3-a456-426614174999";
    private final UUID ROOM_UUID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private final UUID TABLE_UUID = UUID.fromString("771a3400-e29b-41d4-b825-112233445566");
    private final UUID CONTENT_UUID = UUID.fromString("881a3400-e29b-41d4-b825-112233445561");
    private final UUID PARTICIPATION_UUID = UUID.fromString("881a3400-e29b-41d4-b825-112233445562");
    private final UUID SELF_ASSESSMENT_UUID = UUID.fromString("881a3400-e29b-41d4-b825-112233445563");

    private PerformanceTable performanceTable;

    @BeforeEach
    void setUp() {
        User tutorUser = new User();
        tutorUser.setId(UUID.fromString(TUTOR_UUID));
        tutorUser.setName("Tutor Responsável");

        Room room = new Room();
        room.setId(ROOM_UUID);
        room.setName("Módulo PBL 1");
        room.setTutor(tutorUser);

        performanceTable = new PerformanceTable();
        performanceTable.setId(TABLE_UUID);
        performanceTable.setName("Tabela Padrão");
        performanceTable.setRoom(room);
        // Critérios já cadastrados pela US07 com o peso default 1.0
        performanceTable.setCriteriaList(new ArrayList<>(List.of(
                criterion(CONTENT_UUID, "Conteúdo", 1.0),
                criterion(PARTICIPATION_UUID, "Participação", 1.0),
                criterion(SELF_ASSESSMENT_UUID, "Autoavaliação", 1.0))));
    }

    // --- QA: SOMA DE 100% ---

    @Test
    @DisplayName("[QA] Deve gravar os pesos e devolvê-los na resposta quando a soma for exatamente 100% (1.0)")
    void updateCriteriaWeights_WithSumOfOneHundredPercent_SavesWeightsAndReturnsThem() {
        // Arrange (Preparar)
        // Em Double, 0.35 + 0.29 + 0.36 = 0.9999999999999999 tanto na ordem da tabela quanto na do payload:
        // uma comparação "== 1.0" rejeitaria uma fórmula válida. Os três valores são distintos para que
        // um peso aplicado ao critério errado seja detectado
        CriteriaWeightsRequest request = weightsRequest(0.35, 0.29, 0.36);

        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(performanceTableRepository.save(any(PerformanceTable.class))).thenAnswer(i -> i.getArgument(0));

        // Act (Executar)
        PerformanceTableResponse response = performanceTableService.updateCriteriaWeights(TABLE_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        verify(performanceTableRepository).save(tableCaptor.capture());
        PerformanceTable saved = tableCaptor.getValue();
        assertEquals(Map.of(CONTENT_UUID, 0.35, PARTICIPATION_UUID, 0.29, SELF_ASSESSMENT_UUID, 0.36), weightsById(saved.getCriteriaList()));
        // Só o peso muda: os critérios da US07 continuam os mesmos (nome e vínculo com a tabela)
        assertEquals(List.of("Conteúdo", "Participação", "Autoavaliação"),
                saved.getCriteriaList().stream().map(Criterion::getName).toList());
        assertTrue(saved.getCriteriaList().stream().allMatch(c -> c.getPerformanceTable() == saved));

        // O Controller devolve esta resposta como corpo do PUT
        assertEquals(TABLE_UUID, response.getPerformanceTableId());
        assertEquals(Map.of(CONTENT_UUID, 0.35, PARTICIPATION_UUID, 0.29, SELF_ASSESSMENT_UUID, 0.36),
                response.getCriteriaList().stream()
                        .collect(Collectors.toMap(CriterionResponse::getCriterionId, CriterionResponse::getCriteriaWeight)));
        // Os nomes não vêm no payload: aparecerem na resposta prova que ela foi montada a partir da tabela salva
        assertEquals(List.of("Conteúdo", "Participação", "Autoavaliação"),
                response.getCriteriaList().stream().map(CriterionResponse::getCriteriaName).toList());
    }

    // --- QA: SOMAS DE 90% E 110% ---

    @ParameterizedTest(name = "[{index}] Autoavaliação {0} -> soma {1}")
    @CsvSource({"0.2, 90%", "0.4, 110%"})
    @DisplayName("[QA] Deve rejeitar com InvalidWeightSumException e não alterar nada quando a soma for diferente de 100%")
    void updateCriteriaWeights_WithSumDifferentFromOneHundredPercent_ThrowsAndChangesNothing(double selfAssessmentWeight, String sum) {
        // Arrange (Preparar)
        // Conteúdo 0.4 + Participação 0.3 + Autoavaliação (0.2 ou 0.4) = 0.9 ou 1.1
        CriteriaWeightsRequest request = weightsRequest(0.4, 0.3, selfAssessmentWeight);

        // lenient: o teste não impõe se a posse ou a soma é verificada primeiro
        Mockito.lenient().when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));

        // Act & Assert (Executar e Validar)
        InvalidWeightSumException ex = assertThrows(InvalidWeightSumException.class, () ->
                performanceTableService.updateCriteriaWeights(TABLE_UUID, request, TUTOR_UUID)
        );
        assertEquals("A soma dos pesos deve ser exatamente 100% (1.0).", ex.getMessage());
        verify(performanceTableRepository, never()).save(any(PerformanceTable.class));
        Mockito.verifyNoInteractions(criterionRepository);
        // A entidade gerenciada não pode ser alterada antes da validação, ou o dirty checking gravaria os pesos
        assertTrue(performanceTable.getCriteriaList().stream().allMatch(c -> c.getWeight() == 1.0));
    }

    // --- POSSE DA SALA ---

    @Test
    @DisplayName("Deve lançar SecurityException e não alterar nada quando o usuário não for o tutor da sala")
    void updateCriteriaWeights_WhenUserIsNotRoomTutor_ThrowsSecurityException() {
        // Arrange (Preparar)
        CriteriaWeightsRequest request = weightsRequest(0.6, 0.3, 0.1);
        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));

        // Act & Assert (Executar e Validar)
        SecurityException ex = assertThrows(SecurityException.class, () ->
                performanceTableService.updateCriteriaWeights(TABLE_UUID, request, OTHER_USER_UUID)
        );
        assertEquals("Apenas o tutor responsável pela sala pode gerenciar critérios.", ex.getMessage());
        verify(performanceTableRepository, never()).save(any(PerformanceTable.class));
        Mockito.verifyNoInteractions(criterionRepository);
        assertTrue(performanceTable.getCriteriaList().stream().allMatch(c -> c.getWeight() == 1.0));
    }

    // --- CÁLCULO DA NOTA FINAL COM AUTOAVALIAÇÃO ---

    @Test
    @DisplayName("Deve calcular a nota final como soma ponderada pelos pesos dos critérios, incluindo a autoavaliação")
    void calculateFinalGrade_WithSelfAssessmentCriterion_AppliesItsWeight() {
        // Arrange (Preparar)
        Mockito.when(criterionRepository.findByPerformanceTableId(TABLE_UUID)).thenReturn(List.of(
                criterion(CONTENT_UUID, "Conteúdo", 0.4),
                criterion(PARTICIPATION_UUID, "Participação", 0.3),
                criterion(SELF_ASSESSMENT_UUID, "Autoavaliação", 0.3)));

        Map<UUID, Double> gradesByCriterion = Map.of(
                CONTENT_UUID, 8.0,
                PARTICIPATION_UUID, 6.0,
                SELF_ASSESSMENT_UUID, 10.0);

        // Act (Executar)
        double finalGrade = performanceTableService.calculateFinalGrade(TABLE_UUID, gradesByCriterion);

        // Assert (Validar)
        // 8.0*0.4 + 6.0*0.3 + 10.0*0.3 = 3.2 + 1.8 + 3.0 = 8.0
        // Ignorar a autoavaliação daria 5.0, então este valor prova que ela foi integrada ao cálculo
        assertEquals(8.0, finalGrade, 1e-9);
    }

    // Helpers

    private Criterion criterion(UUID id, String name, double weight) {
        Criterion criterion = new Criterion();
        criterion.setId(id);
        criterion.setName(name);
        criterion.setWeight(weight);
        criterion.setPerformanceTable(performanceTable);
        return criterion;
    }

    // Ordem do payload invertida em relação à tabela: o peso deve ser aplicado pelo criterionId, não pela posição
    private CriteriaWeightsRequest weightsRequest(double content, double participation, double selfAssessment) {
        return new CriteriaWeightsRequest(List.of(
                new CriterionWeightRequest(SELF_ASSESSMENT_UUID, selfAssessment),
                new CriterionWeightRequest(PARTICIPATION_UUID, participation),
                new CriterionWeightRequest(CONTENT_UUID, content)));
    }

    private Map<UUID, Double> weightsById(List<Criterion> criteria) {
        return criteria.stream().collect(Collectors.toMap(Criterion::getId, Criterion::getWeight));
    }
}
