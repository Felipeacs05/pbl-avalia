package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableRequest;
import com.uefs.tfs.avaliasystem.dto.PerformanceTableResponse;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("US07 - Testes de Regra de Negócio (Service) da Tabela de Desempenho e Critérios")
class PerformanceTableServiceTest {

    @InjectMocks
    private PerformanceTableService performanceTableService;

    @Mock
    private PerformanceTableRepository performanceTableRepository;

    @Mock
    private CriterionRepository criterionRepository;

    @Mock
    private RoomRepository roomRepository;

    private final String TUTOR_UUID = "123e4567-e89b-12d3-a456-426614174000";
    private final String OTHER_USER_UUID = "999e4567-e89b-12d3-a456-426614174999";
    private final String ROOM_UUID = "550e8400-e29b-41d4-a716-446655440000";
    private final String TABLE_UUID = "tbl-771a3400-e29b-41d4-b825-112233445566";

    private User tutorUser;
    private Room room;
    private PerformanceTable performanceTable;

    @BeforeEach
    void setUp() {
        tutorUser = new User();
        tutorUser.setId(UUID.fromString(TUTOR_UUID));
        tutorUser.setName("Tutor Responsável");

        room = new Room();
        room.setId(ROOM_UUID);
        room.setName("Módulo PBL 1");
        room.setTutor(tutorUser);

        performanceTable = new PerformanceTable();
        performanceTable.setId(TABLE_UUID);
        performanceTable.setName("Tabela Padrão");
        performanceTable.setRoom(room);
        performanceTable.setCriteriaList(new ArrayList<>());
    }

    @Test
    @DisplayName("Deve criar tabela de desempenho e associar critérios vinculados à sala do tutor")
    void createPerformanceTable_WithValidData_SavesSuccessfully() {
        CriterionRequest criterionReq = new CriterionRequest("Postura", "Ética na reunião", 4.0);
        PerformanceTableRequest request = new PerformanceTableRequest(ROOM_UUID, "Tabela de Soft Skills", List.of(criterionReq));

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.save(any(PerformanceTable.class))).thenAnswer(invocation -> {
            PerformanceTable t = invocation.getArgument(0);
            t.setId(TABLE_UUID);
            return t;
        });

        PerformanceTableResponse response = performanceTableService.createPerformanceTable(request, TUTOR_UUID);

        assertNotNull(response);
        assertEquals(TABLE_UUID, response.getPerformanceTableId());
        assertEquals("Tabela de Soft Skills", response.getTableName());
        assertEquals(1, response.getCriteriaList().size());
        assertEquals("Postura", response.getCriteriaList().get(0).getCriteriaName());

        verify(performanceTableRepository).save(any(PerformanceTable.class));
    }

    @Test
    @DisplayName("Deve lançar IllegalArgumentException ao tentar criar tabela para sala inexistente")
    void createPerformanceTable_WhenRoomNotFound_ThrowsException() {
        PerformanceTableRequest request = new PerformanceTableRequest("sala-inexistente", "Tabela", List.of());

        Mockito.when(roomRepository.findById("sala-inexistente")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                performanceTableService.createPerformanceTable(request, TUTOR_UUID)
        );
    }

    @Test
    @DisplayName("Deve lançar SecurityException se usuário não for o tutor da sala")
    void createPerformanceTable_WhenUserIsNotRoomTutor_ThrowsSecurityException() {
        CriterionRequest criterionReq = new CriterionRequest("Postura", "Ética", 2.0);
        PerformanceTableRequest request = new PerformanceTableRequest(ROOM_UUID, "Tabela", List.of(criterionReq));

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));

        assertThrows(SecurityException.class, () ->
                performanceTableService.createPerformanceTable(request, OTHER_USER_UUID)
        );
    }

    @Test
    @DisplayName("Deve adicionar novo critério à tabela com sucesso")
    void addCriterion_WithValidData_AddsSuccessfully() {
        CriterionRequest criterionReq = new CriterionRequest("Raciocínio Lógico", "Problemas complexos", 6.0);

        Criterion savedCriterion = new Criterion();
        savedCriterion.setId("crit-99");
        savedCriterion.setName("Raciocínio Lógico");
        savedCriterion.setDescription("Problemas complexos");
        savedCriterion.setWeight(6.0);
        savedCriterion.setPerformanceTable(performanceTable);

        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenReturn(savedCriterion);

        CriterionResponse response = performanceTableService.addCriterion(TABLE_UUID, criterionReq, TUTOR_UUID);

        assertNotNull(response);
        assertEquals("crit-99", response.getCriterionId());
        assertEquals("Raciocínio Lógico", response.getCriteriaName());

        verify(criterionRepository).save(any(Criterion.class));
    }

    @Test
    @DisplayName("Deve remover critério existente com sucesso")
    void deleteCriterion_WhenBelongsToTable_DeletesSuccessfully() {
        Criterion criterion = new Criterion();
        criterion.setId("crit-01");
        criterion.setName("Critério Antigo");
        criterion.setPerformanceTable(performanceTable);

        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(criterionRepository.findById("crit-01")).thenReturn(Optional.of(criterion));

        performanceTableService.deleteCriterion(TABLE_UUID, "crit-01", TUTOR_UUID);

        verify(criterionRepository).delete(criterion);
    }

    @Test
    @DisplayName("Deve lançar IllegalArgumentException se o critério não pertencer à tabela informada")
    void deleteCriterion_WhenCriterionBelongsToAnotherTable_ThrowsException() {
        PerformanceTable otherTable = new PerformanceTable();
        otherTable.setId("other-table-id");

        Criterion criterion = new Criterion();
        criterion.setId("crit-01");
        criterion.setPerformanceTable(otherTable);

        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(criterionRepository.findById("crit-01")).thenReturn(Optional.of(criterion));

        assertThrows(IllegalArgumentException.class, () ->
                performanceTableService.deleteCriterion(TABLE_UUID, "crit-01", TUTOR_UUID)
        );
    }
}
