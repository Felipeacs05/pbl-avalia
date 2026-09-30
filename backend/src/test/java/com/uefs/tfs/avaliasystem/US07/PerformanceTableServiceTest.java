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
import org.junit.jupiter.api.Disabled;
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
import static org.mockito.Mockito.never;
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

    // =========================================================================
    // TESTES EXISTENTES (PRESERVADOS CONFORME REGRAS)
    // =========================================================================

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

    // =========================================================================
    // NOVOS TESTES: AUTORIZAÇÃO (ITEM C)
    // =========================================================================

    @Test
    @DisplayName("Deve lançar SecurityException ao tentar adicionar critério por usuário que não é tutor da sala")
    void addCriterion_WhenUserIsNotRoomTutor_ThrowsSecurityException() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Comunicação", "Expressão oral", 2.0);
        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));

        // Act & Assert (Executar e Validar)
        SecurityException ex = assertThrows(SecurityException.class, () ->
                performanceTableService.addCriterion(TABLE_UUID, request, OTHER_USER_UUID)
        );
        assertEquals("Apenas o tutor responsável pela sala pode gerenciar critérios.", ex.getMessage());
        verify(criterionRepository, never()).save(any(Criterion.class));
    }

    @Test
    @DisplayName("Deve lançar SecurityException ao tentar remover critério por usuário que não é tutor da sala")
    void deleteCriterion_WhenUserIsNotRoomTutor_ThrowsSecurityException() {
        // Arrange (Preparar)
        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));

        // Act & Assert (Executar e Validar)
        SecurityException ex = assertThrows(SecurityException.class, () ->
                performanceTableService.deleteCriterion(TABLE_UUID, "crit-01", OTHER_USER_UUID)
        );
        assertEquals("Apenas o tutor responsável pela sala pode remover critérios.", ex.getMessage());
        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    // =========================================================================
    // NOVOS TESTES: BORDAS DE NEGÓCIO E LIMITES (ITEM D)
    // =========================================================================

    @Test
    @DisplayName("Deve lançar IllegalArgumentException ao tentar adicionar critério em tabela inexistente")
    void addCriterion_WhenTableNotFound_ThrowsException() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Liderança", "Proatividade", 1.0);
        Mockito.when(performanceTableRepository.findById("tabela-inexistente")).thenReturn(Optional.empty());

        // Act & Assert (Executar e Validar)
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                performanceTableService.addCriterion("tabela-inexistente", request, TUTOR_UUID)
        );
        assertTrue(ex.getMessage().contains("Tabela de desempenho não encontrada"));
        verify(criterionRepository, never()).save(any(Criterion.class));
    }

    @Test
    @DisplayName("Deve lançar IllegalArgumentException ao tentar remover critério de tabela inexistente")
    void deleteCriterion_WhenTableNotFound_ThrowsException() {
        // Arrange (Preparar)
        Mockito.when(performanceTableRepository.findById("tabela-inexistente")).thenReturn(Optional.empty());

        // Act & Assert (Executar e Validar)
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                performanceTableService.deleteCriterion("tabela-inexistente", "crit-01", TUTOR_UUID)
        );
        assertTrue(ex.getMessage().contains("Tabela de desempenho não encontrada"));
        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    @Test
    @DisplayName("Deve lançar IllegalArgumentException ao tentar remover critério inexistente no repositório")
    void deleteCriterion_WhenCriterionNotFound_ThrowsException() {
        // Arrange (Preparar)
        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(criterionRepository.findById("crit-inexistente")).thenReturn(Optional.empty());

        // Act & Assert (Executar e Validar)
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                performanceTableService.deleteCriterion(TABLE_UUID, "crit-inexistente", TUTOR_UUID)
        );
        assertTrue(ex.getMessage().contains("Critério não encontrado"));
        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    @Test
    @DisplayName("Deve permitir inclusão de critério com peso zero (valor mínimo positivo ou nulo)")
    void addCriterion_WhenWeightIsZero_AddsSuccessfully() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Participação Opcional", "Feedback formativo sem nota", 0.0);
        Criterion saved = new Criterion();
        saved.setId("crit-zero");
        saved.setName("Participação Opcional");
        saved.setWeight(0.0);
        saved.setPerformanceTable(performanceTable);

        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenReturn(saved);

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterion(TABLE_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals(0.0, response.getCriteriaWeight());
        verify(criterionRepository).save(any(Criterion.class));
    }

    @Test
    @DisplayName("Deve atribuir peso default 1.0 quando o peso do critério for omitido (nulo)")
    void addCriterion_WhenWeightIsOmitted_DefaultsToOne() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Pontualidade", "Chegada no horário", null);
        Criterion saved = new Criterion();
        saved.setId("crit-default");
        saved.setName("Pontualidade");
        saved.setWeight(1.0);
        saved.setPerformanceTable(performanceTable);

        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenAnswer(invocation -> {
            Criterion c = invocation.getArgument(0);
            assertEquals(1.0, c.getWeight(), "O peso omitido deve assumir o default 1.0");
            c.setId("crit-default");
            return c;
        });

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterion(TABLE_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals(1.0, response.getCriteriaWeight());
    }

    @Test
    @DisplayName("Deve aceitar critério composto exclusivamente por hífens respeitando regex e não-vazio")
    void addCriterion_WhenNameHasOnlyHyphens_AddsSuccessfully() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("---", "Critério demarcador", 1.0);
        Criterion saved = new Criterion();
        saved.setId("crit-hyphens");
        saved.setName("---");
        saved.setWeight(1.0);
        saved.setPerformanceTable(performanceTable);

        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenReturn(saved);

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterion(TABLE_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals("---", response.getCriteriaName());
        verify(criterionRepository).save(any(Criterion.class));
    }

    @Test
    @DisplayName("Deve aceitar critério com caracteres acentuados da língua portuguesa")
    void addCriterion_WhenNameHasAccents_AddsSuccessfully() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Raciocínio Lógico & Atenção", "Capacidade analítica", 3.5);
        // Observação: "&" é especial, mas acentuação como "Raciocínio Lógico" deve ser plenamente aceita
        CriterionRequest requestWithAccents = new CriterionRequest("Raciocínio Lógico de Atenção", "Capacidade analítica", 3.5);
        Criterion saved = new Criterion();
        saved.setId("crit-accent");
        saved.setName("Raciocínio Lógico de Atenção");
        saved.setWeight(3.5);
        saved.setPerformanceTable(performanceTable);

        Mockito.when(performanceTableRepository.findById(TABLE_UUID)).thenReturn(Optional.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenReturn(saved);

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterion(TABLE_UUID, requestWithAccents, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals("Raciocínio Lógico de Atenção", response.getCriteriaName());
        verify(criterionRepository).save(any(Criterion.class));
    }

    // =========================================================================
    // ITENS E & F: LACUNAS DE NEGÓCIO NÃO IMPLEMENTADAS (@Disabled)
    // =========================================================================

    @Test
    @Disabled("US07 - funcionalidade não implementada: edição de tabelas e critérios (PUT/PATCH)")
    @DisplayName("Contrato esperado: Deve atualizar nome e dados cadastrais da tabela de desempenho existente via PUT")
    void updatePerformanceTable_WhenFeatureNotImplemented_ExpectContract() {
        // Contrato esperado: PUT /api/v1/performance-tables/{id} atualizando nome da tabela
        fail("Funcionalidade de edição de tabela não implementada no service.");
    }

    @Test
    @Disabled("US07 - funcionalidade não implementada: seleção/ativação de critérios")
    @DisplayName("Contrato esperado: Deve ativar ou desativar critério para definir quais serão usados na avaliação")
    void toggleCriterionActiveStatus_WhenFeatureNotImplemented_ExpectContract() {
        // Contrato esperado: PATCH /api/v1/performance-tables/{tableId}/criteria/{criterionId}/status alterando status
        fail("Funcionalidade de seleção/ativação de critérios não implementada no service.");
    }
}
