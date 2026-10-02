package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.dto.CriterionResponse;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * Testes de regra de negócio (camada de Service) para a US07.
 *
 * Cobertura:
 * - Métodos do novo contrato: addCriterionToRoom, getCriteriaByRoom, deleteCriterionFromRoom.
 * - A PerformanceTable é criada implicitamente pelo service quando necessário (Modelo A).
 * - Testes usam Mockito puro (sem contexto Spring), pois há testes de integração H2 na camada acima.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("US07 - Testes de Regra de Negócio (Service) — contrato /api/v1/rooms/{roomId}/criteria")
class PerformanceTableServiceTest {

    @InjectMocks
    private PerformanceTableService performanceTableService;

    @Mock
    private PerformanceTableRepository performanceTableRepository;

    @Mock
    private CriterionRepository criterionRepository;

    @Mock
    private RoomRepository roomRepository;

    private final String TUTOR_UUID       = "123e4567-e89b-12d3-a456-426614174000";
    private final String OTHER_USER_UUID  = "999e4567-e89b-12d3-a456-426614174999";
    private final String ROOM_UUID        = "550e8400-e29b-41d4-a716-446655440000";
    private final String TABLE_UUID       = "tbl-771a3400-e29b-41d4-b825-112233445566";
    private final String CRITERION_UUID   = "crit-01";

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

        // PerformanceTable implícita (transparente para a API — Modelo A)
        performanceTable = new PerformanceTable();
        performanceTable.setId(TABLE_UUID);
        performanceTable.setName("Tabela Implícita da Sala");
        performanceTable.setRoom(room);
        performanceTable.setCriteriaList(new ArrayList<>());
    }

    // =========================================================================
    // addCriterionToRoom — caminho feliz
    // =========================================================================

    @Test
    @DisplayName("addCriterionToRoom - Tutor da sala: deve salvar critério com sucesso")
    void addCriterionToRoom_TutorDaSala_SalvaComSucesso() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Raciocínio Lógico", "Problemas complexos", 6.0);

        Criterion savedCriterion = new Criterion();
        savedCriterion.setId(CRITERION_UUID);
        savedCriterion.setName("Raciocínio Lógico");
        savedCriterion.setDescription("Problemas complexos");
        savedCriterion.setWeight(6.0);
        savedCriterion.setPerformanceTable(performanceTable);

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenReturn(savedCriterion);

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterionToRoom(ROOM_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals(CRITERION_UUID, response.getCriterionId());
        assertEquals("Raciocínio Lógico", response.getCriteriaName());
        verify(criterionRepository).save(any(Criterion.class));
    }

    @Test
    @DisplayName("addCriterionToRoom - Sala inexistente: deve lançar IllegalStateException")
    void addCriterionToRoom_SalaInexistente_LancaIllegalStateException() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Liderança", "Proatividade", 1.0);
        Mockito.when(roomRepository.findById("sala-inexistente")).thenReturn(Optional.empty());

        // Act & Assert (Executar e Validar)
        // Nota: IllegalStateException deve ser mapeada para 404 no GlobalExceptionHandler (pendência Leonardo).
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                performanceTableService.addCriterionToRoom("sala-inexistente", request, TUTOR_UUID)
        );
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("Sala não encontrada"));
        verify(criterionRepository, never()).save(any(Criterion.class));
    }

    @Test
    @DisplayName("addCriterionToRoom - Usuário não é tutor da sala: deve lançar SecurityException")
    void addCriterionToRoom_UsuarioNaoETutor_LancaSecurityException() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Comunicação", "Expressão oral", 2.0);
        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));

        // Act & Assert (Executar e Validar)
        SecurityException ex = assertThrows(SecurityException.class, () ->
                performanceTableService.addCriterionToRoom(ROOM_UUID, request, OTHER_USER_UUID)
        );
        assertEquals("Apenas o tutor responsável pela sala pode gerenciar critérios.", ex.getMessage());
        verify(criterionRepository, never()).save(any(Criterion.class));
    }

    @Test
    @DisplayName("addCriterionToRoom - Peso zero (0.0): deve salvar com sucesso")
    void addCriterionToRoom_PesoZero_SalvaComSucesso() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Participação Opcional", "Feedback formativo sem nota", 0.0);

        Criterion saved = new Criterion();
        saved.setId("crit-zero");
        saved.setName("Participação Opcional");
        saved.setWeight(0.0);
        saved.setPerformanceTable(performanceTable);

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenReturn(saved);

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterionToRoom(ROOM_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals(0.0, response.getCriteriaWeight());
        verify(criterionRepository).save(any(Criterion.class));
    }

    @Test
    @DisplayName("addCriterionToRoom - Peso omitido (nulo): deve atribuir peso padrão 1.0")
    void addCriterionToRoom_PesoOmitido_AtribuiPesoPadrao() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Pontualidade", "Chegada no horário", null);

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenAnswer(invocation -> {
            Criterion c = invocation.getArgument(0);
            assertEquals(1.0, c.getWeight(), "O peso omitido deve assumir o default 1.0");
            c.setId("crit-default");
            return c;
        });

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterionToRoom(ROOM_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals(1.0, response.getCriteriaWeight());
    }

    @Test
    @DisplayName("addCriterionToRoom - Nome somente com hífens: deve salvar com sucesso")
    void addCriterionToRoom_NomeSomenteHifens_SalvaComSucesso() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("---", "Critério demarcador", 1.0);

        Criterion saved = new Criterion();
        saved.setId("crit-hyphens");
        saved.setName("---");
        saved.setWeight(1.0);
        saved.setPerformanceTable(performanceTable);

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenReturn(saved);

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterionToRoom(ROOM_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals("---", response.getCriteriaName());
        verify(criterionRepository).save(any(Criterion.class));
    }

    @Test
    @DisplayName("addCriterionToRoom - Nome com acentos da língua portuguesa: deve salvar com sucesso")
    void addCriterionToRoom_NomeComAcentos_SalvaComSucesso() {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Raciocínio Lógico de Atenção", "Capacidade analítica", 3.5);

        Criterion saved = new Criterion();
        saved.setId("crit-accent");
        saved.setName("Raciocínio Lógico de Atenção");
        saved.setWeight(3.5);
        saved.setPerformanceTable(performanceTable);

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.save(any(Criterion.class))).thenReturn(saved);

        // Act (Executar)
        CriterionResponse response = performanceTableService.addCriterionToRoom(ROOM_UUID, request, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(response);
        assertEquals("Raciocínio Lógico de Atenção", response.getCriteriaName());
        verify(criterionRepository).save(any(Criterion.class));
    }

    // =========================================================================
    // getCriteriaByRoom — caminho feliz e erros
    // =========================================================================

    @Test
    @DisplayName("getCriteriaByRoom - Tutor da sala: deve retornar lista de critérios")
    void getCriteriaByRoom_TutorDaSala_RetornaLista() {
        // Arrange (Preparar)
        Criterion c1 = new Criterion();
        c1.setId("crit-A");
        c1.setName("Postura");
        c1.setWeight(3.0);
        c1.setPerformanceTable(performanceTable);

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.findByPerformanceTableId(TABLE_UUID)).thenReturn(List.of(c1));

        // Act (Executar)
        List<CriterionResponse> result = performanceTableService.getCriteriaByRoom(ROOM_UUID, TUTOR_UUID);

        // Assert (Validar)
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Postura", result.get(0).getCriteriaName());
    }

    @Test
    @DisplayName("getCriteriaByRoom - Sala inexistente: deve lançar IllegalStateException")
    void getCriteriaByRoom_SalaInexistente_LancaIllegalStateException() {
        // Arrange (Preparar)
        Mockito.when(roomRepository.findById("sala-inexistente")).thenReturn(Optional.empty());

        // Act & Assert (Executar e Validar)
        assertThrows(IllegalStateException.class, () ->
                performanceTableService.getCriteriaByRoom("sala-inexistente", TUTOR_UUID)
        );
    }

    @Test
    @DisplayName("getCriteriaByRoom - Usuário não é tutor da sala: deve lançar SecurityException")
    void getCriteriaByRoom_UsuarioNaoETutor_LancaSecurityException() {
        // Arrange (Preparar)
        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));

        // Act & Assert (Executar e Validar)
        SecurityException ex = assertThrows(SecurityException.class, () ->
                performanceTableService.getCriteriaByRoom(ROOM_UUID, OTHER_USER_UUID)
        );
        assertEquals("Apenas o tutor responsável pela sala pode visualizar os critérios.", ex.getMessage());
    }

    // =========================================================================
    // deleteCriterionFromRoom — caminho feliz e erros
    // =========================================================================

    @Test
    @DisplayName("deleteCriterionFromRoom - Tutor da sala: deve remover critério com sucesso")
    void deleteCriterionFromRoom_TutorDaSala_RemoveComSucesso() {
        // Arrange (Preparar)
        Criterion criterion = new Criterion();
        criterion.setId(CRITERION_UUID);
        criterion.setName("Critério Antigo");
        criterion.setPerformanceTable(performanceTable);

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.findById(CRITERION_UUID)).thenReturn(Optional.of(criterion));

        // Act (Executar)
        performanceTableService.deleteCriterionFromRoom(ROOM_UUID, CRITERION_UUID, TUTOR_UUID);

        // Assert (Validar)
        verify(criterionRepository).delete(criterion);
    }

    @Test
    @DisplayName("deleteCriterionFromRoom - Sala inexistente: deve lançar IllegalStateException")
    void deleteCriterionFromRoom_SalaInexistente_LancaIllegalStateException() {
        // Arrange (Preparar)
        Mockito.when(roomRepository.findById("sala-inexistente")).thenReturn(Optional.empty());

        // Act & Assert (Executar e Validar)
        assertThrows(IllegalStateException.class, () ->
                performanceTableService.deleteCriterionFromRoom("sala-inexistente", CRITERION_UUID, TUTOR_UUID)
        );
        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    @Test
    @DisplayName("deleteCriterionFromRoom - Usuário não é tutor da sala: deve lançar SecurityException")
    void deleteCriterionFromRoom_UsuarioNaoETutor_LancaSecurityException() {
        // Arrange (Preparar)
        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));

        // Act & Assert (Executar e Validar)
        SecurityException ex = assertThrows(SecurityException.class, () ->
                performanceTableService.deleteCriterionFromRoom(ROOM_UUID, CRITERION_UUID, OTHER_USER_UUID)
        );
        assertEquals("Apenas o tutor responsável pela sala pode remover critérios.", ex.getMessage());
        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    @Test
    @DisplayName("deleteCriterionFromRoom - Critério inexistente: deve lançar IllegalArgumentException")
    void deleteCriterionFromRoom_CriterioInexistente_LancaIllegalArgumentException() {
        // Arrange (Preparar)
        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.findById("crit-inexistente")).thenReturn(Optional.empty());

        // Act & Assert (Executar e Validar)
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                performanceTableService.deleteCriterionFromRoom(ROOM_UUID, "crit-inexistente", TUTOR_UUID)
        );
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("Critério não encontrado"));
        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    @Test
    @DisplayName("deleteCriterionFromRoom - Critério pertence a outra sala: deve lançar IllegalArgumentException")
    void deleteCriterionFromRoom_CriterioDeOutraSala_LancaIllegalArgumentException() {
        // Arrange (Preparar)
        PerformanceTable outraTabela = new PerformanceTable();
        outraTabela.setId("tabela-outra-sala");

        Room outraSala = new Room();
        outraSala.setId("outra-sala-id");
        outraTabela.setRoom(outraSala);

        Criterion criterioDeOutraSala = new Criterion();
        criterioDeOutraSala.setId("crit-outra-sala");
        criterioDeOutraSala.setPerformanceTable(outraTabela);

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        Mockito.when(performanceTableRepository.findByRoomId(ROOM_UUID)).thenReturn(List.of(performanceTable));
        Mockito.when(criterionRepository.findById("crit-outra-sala")).thenReturn(Optional.of(criterioDeOutraSala));

        // Act & Assert (Executar e Validar)
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                performanceTableService.deleteCriterionFromRoom(ROOM_UUID, "crit-outra-sala", TUTOR_UUID)
        );
        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("não pertence a esta sala"));
        verify(criterionRepository, never()).delete(any(Criterion.class));
    }

    // =========================================================================
    // FORA DE ESCOPO DO CARD /salas/{id}/criterios
    // =========================================================================

    @Test
    @Disabled("Fora do escopo do card /salas/{id}/criterios: edição de critérios (PUT/PATCH)")
    @DisplayName("Contrato futuro: Deve atualizar nome e dados cadastrais do critério via PUT")
    void updateCriterion_WhenFeatureNotImplemented_ExpectContract() {
        org.junit.jupiter.api.Assertions.fail("Funcionalidade de edição de critério não implementada no service.");
    }

    @Test
    @Disabled("Fora do escopo do card /salas/{id}/criterios: ativação/desativação de critérios (PATCH /status)")
    @DisplayName("Contrato futuro: Deve ativar ou desativar critério para definir quais serão usados na avaliação")
    void toggleCriterionStatus_WhenFeatureNotImplemented_ExpectContract() {
        org.junit.jupiter.api.Assertions.fail("Funcionalidade de seleção/ativação de critérios não implementada no service.");
    }
}
