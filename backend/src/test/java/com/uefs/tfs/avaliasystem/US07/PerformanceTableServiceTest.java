package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("US07 - Testes de regra de negócio de critérios")
class PerformanceTableServiceTest {

    private static final UUID TUTOR_ID =
            UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private static final UUID OTHER_USER_ID =
            UUID.fromString("999e4567-e89b-12d3-a456-426614174999");
    private static final UUID ROOM_ID =
            UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID TABLE_ID =
            UUID.fromString("771a3400-e29b-41d4-b825-112233445566");
    private static final UUID CRITERION_ID =
            UUID.fromString("881a3400-e29b-41d4-b825-112233445566");
    private static final UUID SECOND_CRITERION_ID =
            UUID.fromString("881a3400-e29b-41d4-b825-112233445567");

    @InjectMocks
    private PerformanceTableService performanceTableService;

    @Mock
    private PerformanceTableRepository performanceTableRepository;

    @Mock
    private CriterionRepository criterionRepository;

    @Mock
    private RoomRepository roomRepository;

    private Room room;
    private PerformanceTable table;

    @BeforeEach
    void setUp() {
        User tutor = new User();
        tutor.setId(TUTOR_ID);
        tutor.setName("Tutor responsável");

        room = new Room();
        room.setId(ROOM_ID);
        room.setName("Sala de teste");
        room.setTutor(tutor);

        table = new PerformanceTable();
        table.setId(TABLE_ID);
        table.setName("Tabela de desempenho");
        table.setRoom(room);
        table.setCriteriaList(new ArrayList<>());
    }

    @Test
    @DisplayName("Adiciona o primeiro critério com peso total igual a 1")
    void addCriterion_FirstCriterion_AssignsFullWeight() {
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));
        Mockito.when(criterionRepository.save(any(Criterion.class)))
                .thenAnswer(invocation -> {
                    Criterion criterion = invocation.getArgument(0);
                    criterion.setId(CRITERION_ID);
                    return criterion;
                });

        CriterionResponse response = performanceTableService.addCriterion(
                TABLE_ID,
                new CriterionRequest("Postura", "Comportamento", null),
                TUTOR_ID
        );

        assertEquals(CRITERION_ID, response.getCriterionId());
        assertEquals(1.0, response.getCriteriaWeight());
        assertEquals(1.0, table.getCriteriaList().get(0).getWeight());
        verify(criterionRepository).save(any(Criterion.class));
    }

    @Test
    @DisplayName("Distribui o peso igualmente quando o novo peso não é informado")
    void addCriterion_WeightOmitted_DistributesWeightsEqually() {
        Criterion existing = criterion(CRITERION_ID, "Postura", 1.0);
        table.getCriteriaList().add(existing);
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));
        Mockito.when(criterionRepository.save(any(Criterion.class)))
                .thenAnswer(invocation -> {
                    Criterion criterion = invocation.getArgument(0);
                    criterion.setId(SECOND_CRITERION_ID);
                    return criterion;
                });

        CriterionResponse response = performanceTableService.addCriterion(
                TABLE_ID,
                new CriterionRequest("Participação", "Envolvimento", null),
                TUTOR_ID
        );

        assertEquals(0.5, existing.getWeight());
        assertEquals(0.5, response.getCriteriaWeight());
        assertEquals(2, table.getCriteriaList().size());
    }

    @Test
    @DisplayName("Redistribui proporcionalmente o peso ao adicionar um peso explícito")
    void addCriterion_ExplicitWeight_RedistributesRemainingWeight() {
        Criterion existing = criterion(CRITERION_ID, "Postura", 1.0);
        table.getCriteriaList().add(existing);
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));
        Mockito.when(criterionRepository.save(any(Criterion.class)))
                .thenAnswer(invocation -> {
                    Criterion criterion = invocation.getArgument(0);
                    criterion.setId(SECOND_CRITERION_ID);
                    return criterion;
                });

        CriterionResponse response = performanceTableService.addCriterion(
                TABLE_ID,
                new CriterionRequest("Participação", "Envolvimento", 0.25),
                TUTOR_ID
        );

        assertEquals(0.75, existing.getWeight());
        assertEquals(0.25, response.getCriteriaWeight());
    }

    @Test
    @DisplayName("Rejeita peso acima de 1 sem persistir o critério")
    void addCriterion_WeightAboveOne_RejectsRequest() {
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));

        assertThrows(InvalidWeightSumException.class, () ->
                performanceTableService.addCriterion(
                        TABLE_ID,
                        new CriterionRequest("Postura", "Comportamento", 1.1),
                        TUTOR_ID
                )
        );

        verify(criterionRepository, never()).save(any(Criterion.class));
    }

    @Test
    @DisplayName("Impede usuário que não é tutor de adicionar critério")
    void addCriterion_NonOwner_RejectsRequest() {
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));

        assertThrows(SecurityException.class, () ->
                performanceTableService.addCriterion(
                        TABLE_ID,
                        new CriterionRequest("Postura", "Comportamento", 1.0),
                        OTHER_USER_ID
                )
        );

        verify(criterionRepository, never()).save(any(Criterion.class));
    }

    @Test
    @DisplayName("Retorna os critérios pertencentes à tabela")
    void getPerformanceTable_ReturnsCriteria() {
        table.getCriteriaList().add(
                criterion(CRITERION_ID, "Postura", 1.0)
        );
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));

        PerformanceTableResponse response =
                performanceTableService.getPerformanceTable(TABLE_ID);

        assertEquals(TABLE_ID, response.getPerformanceTableId());
        assertEquals(ROOM_ID, response.getRoomId());
        assertEquals(1, response.getCriteriaList().size());
        assertEquals(
                CRITERION_ID,
                response.getCriteriaList().get(0).getCriterionId()
        );
    }

    @Test
    @DisplayName("Remove critério e redistribui o peso restante")
    void deleteCriterion_RedistributesRemainingWeight() {
        Criterion removed = criterion(CRITERION_ID, "Postura", 0.4);
        Criterion remaining = criterion(
                SECOND_CRITERION_ID,
                "Participação",
                0.6
        );
        table.getCriteriaList().addAll(List.of(removed, remaining));
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));

        performanceTableService.deleteCriterion(
                TABLE_ID,
                CRITERION_ID,
                TUTOR_ID
        );

        assertEquals(List.of(remaining), table.getCriteriaList());
        assertEquals(1.0, remaining.getWeight());
        verify(criterionRepository).delete(removed);
        verify(performanceTableRepository).save(table);
    }

    @Test
    @DisplayName("Impede a remoção do último critério da tabela")
    void deleteCriterion_LastCriterion_RejectsRequest() {
        Criterion onlyCriterion = criterion(CRITERION_ID, "Postura", 1.0);
        table.getCriteriaList().add(onlyCriterion);
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));

        assertThrows(InvalidWeightSumException.class, () ->
                performanceTableService.deleteCriterion(
                        TABLE_ID,
                        CRITERION_ID,
                        TUTOR_ID
                )
        );

        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    @Test
    @DisplayName("Rejeita critério que não pertence à tabela informada")
    void deleteCriterion_CriterionFromAnotherTable_RejectsRequest() {
        Criterion tableCriterion = criterion(CRITERION_ID, "Postura", 0.5);
        table.getCriteriaList().add(tableCriterion);
        Mockito.when(performanceTableRepository.findById(TABLE_ID))
                .thenReturn(Optional.of(table));

        assertThrows(IllegalArgumentException.class, () ->
                performanceTableService.deleteCriterion(
                        TABLE_ID,
                        SECOND_CRITERION_ID,
                        TUTOR_ID
                )
        );

        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    private Criterion criterion(UUID id, String name, double weight) {
        Criterion criterion = new Criterion();
        criterion.setId(id);
        criterion.setName(name);
        criterion.setWeight(weight);
        criterion.setPerformanceTable(table);
        return criterion;
    }
}
