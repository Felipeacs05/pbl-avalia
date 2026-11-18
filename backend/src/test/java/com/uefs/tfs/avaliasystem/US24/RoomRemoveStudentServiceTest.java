package com.uefs.tfs.avaliasystem.US24;

import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.RateLimitingService;
import com.uefs.tfs.avaliasystem.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Contrato assumido:
 * - Serviço: RoomService.removeStudentFromRoom(UUID roomId, UUID studentId, UUID tutorId)
 *   - Sala inexistente -> IllegalArgumentException("Sala não encontrada")
 *   - Tutor de outra sala -> SecurityException("Apenas o Tutor da sala possui permissão para gerenciar alunos.")
 *   - Vínculo inexistente -> IllegalArgumentException("Aluno não encontrado na sala")
 *   - Sucesso: RoomMember.active=false, unlinkedAt=Instant.now(), linha preservada (sem delete)
 * - ACHADO US24-A4: Segunda remoção sobrescreve unlinkedAt (perde data real da saída).
 *   O teste que documenta o comportamento correto está @Disabled; o teste ao lado documenta o comportamento atual.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[US24] Testes Unitários de RoomService.removeStudentFromRoom")
class RoomRemoveStudentServiceTest {

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RateLimitingService rateLimitingService;

    // RoomService tem @PersistenceContext EntityManager — usamos construtor direto no setUp
    private RoomService roomService;

    private static final UUID ROOM_ID    = UUID.randomUUID();
    private static final UUID TUTOR_ID   = UUID.randomUUID();
    private static final UUID STUDENT_ID = UUID.randomUUID();
    private static final UUID INTRUDER_ID = UUID.randomUUID();

    private Room room;
    private User tutor;
    private User student;
    private RoomMember activeMember;

    @BeforeEach
    void setUp() {
        // Inicializa via construtor (evita @InjectMocks + @PersistenceContext)
        roomService = new RoomService(roomRepository, userRepository, roomMemberRepository, rateLimitingService);

        tutor = new User();
        tutor.setId(TUTOR_ID);
        tutor.setName("Tutor US24");
        tutor.setEmail("tutor24@uefs.br");
        tutor.setPassword("hash");

        student = new User();
        student.setId(STUDENT_ID);
        student.setName("Aluno US24");
        student.setEmail("aluno24@uefs.br");
        student.setPassword("hash");

        room = new Room();
        room.setId(ROOM_ID);
        room.setName("Sala US24");
        room.setAccessCode("US24XX");
        room.setTutor(tutor);

        activeMember = new RoomMember();
        activeMember.setId(UUID.randomUUID());
        activeMember.setRoom(room);
        activeMember.setUser(student);
        activeMember.setRole(Role.STUDENT);
        activeMember.setActive(true);
        activeMember.setUnlinkedAt(null);
    }

    // ─────────────── CENÁRIO DE SUCESSO ───────────────

    @Test
    @DisplayName("[US24] Deve inativar o RoomMember (active=false, unlinkedAt não nulo) sem deletar a linha")
    void removeStudentFromRoom_ValidTutor_SetsActiveFalseAndUnlinkedAtPreservingRow() {
        // Arrange (Dado sala, tutor correto e membro ativo)
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        when(roomMemberRepository.findByRoomIdAndUserId(ROOM_ID, STUDENT_ID))
                .thenReturn(Optional.of(activeMember));
        when(roomMemberRepository.save(any(RoomMember.class))).thenAnswer(i -> i.getArgument(0));

        Instant before = Instant.now();

        // Act (Quando o tutor remove o aluno)
        roomService.removeStudentFromRoom(ROOM_ID, STUDENT_ID, TUTOR_ID);

        // Assert — captura o RoomMember salvo e verifica o soft delete
        ArgumentCaptor<RoomMember> captor = ArgumentCaptor.forClass(RoomMember.class);
        verify(roomMemberRepository, times(1)).save(captor.capture());
        // Nunca deve deletar fisicamente a linha
        verify(roomMemberRepository, never()).delete(any());
        verify(roomMemberRepository, never()).deleteById(any());

        RoomMember saved = captor.getValue();
        // A MESMA instância deve ser persistida (mesmo id, sem new)
        assertEquals(activeMember.getId(), saved.getId(),
                "Deve reutilizar a mesma linha do banco (soft delete, não novo registro)");
        assertFalse(saved.isActive(),
                "O vínculo deve ficar inativo após a remoção");
        assertNotNull(saved.getUnlinkedAt(),
                "unlinkedAt deve ser preenchido com o instante da remoção");
        assertThat(saved.getUnlinkedAt())
                .as("unlinkedAt deve ser >= ao momento antes da chamada")
                .isAfterOrEqualTo(before);
    }

    // ─────────────── CENÁRIOS NEGATIVOS ───────────────

    @Test
    @DisplayName("[US24] Deve lançar SecurityException quando o tutorId não pertence à sala")
    void removeStudentFromRoom_WrongTutor_ThrowsSecurityExceptionAndNeverSaves() {
        // Arrange (Tutor intruso de outra sala)
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));

        // Act & Assert
        SecurityException ex = assertThrows(
                SecurityException.class,
                () -> roomService.removeStudentFromRoom(ROOM_ID, STUDENT_ID, INTRUDER_ID)
        );

        assertThat(ex.getMessage()).contains("permissão");
        // Nenhum vínculo deve ser alterado
        verify(roomMemberRepository, never()).save(any());
        verify(roomMemberRepository, never()).findByRoomIdAndUserId(any(), any());
    }

    @Test
    @DisplayName("[US24] Deve lançar IllegalArgumentException quando a sala não for encontrada")
    void removeStudentFromRoom_RoomNotFound_ThrowsIllegalArgumentException() {
        // Arrange
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(
                IllegalArgumentException.class,
                () -> roomService.removeStudentFromRoom(ROOM_ID, STUDENT_ID, TUTOR_ID)
        );
        verify(roomMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("[US24] Deve lançar IllegalArgumentException quando o aluno não possui vínculo com a sala")
    void removeStudentFromRoom_StudentNotMember_ThrowsIllegalArgumentException() {
        // Arrange (Aluno não tem RoomMember nesta sala)
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        when(roomMemberRepository.findByRoomIdAndUserId(ROOM_ID, STUDENT_ID))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(
                IllegalArgumentException.class,
                () -> roomService.removeStudentFromRoom(ROOM_ID, STUDENT_ID, TUTOR_ID)
        );
        verify(roomMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("[US24] Aluno de outra sala (studentId válido mas sem vínculo) -> IllegalArgumentException")
    void removeStudentFromRoom_StudentFromAnotherRoom_ThrowsIllegalArgumentException() {
        // Arrange (UUID válido, mas findByRoomIdAndUserId retorna vazio pois a sala é diferente)
        UUID outsiderStudentId = UUID.randomUUID();
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        when(roomMemberRepository.findByRoomIdAndUserId(ROOM_ID, outsiderStudentId))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(
                IllegalArgumentException.class,
                () -> roomService.removeStudentFromRoom(ROOM_ID, outsiderStudentId, TUTOR_ID)
        );
        verify(roomMemberRepository, never()).save(any());
    }

    // ─────────────── ACHADO: SEGUNDA REMOÇÃO ───────────────

    @Nested
    @DisplayName("[US24] ACHADO A4 — Segunda remoção sobrescreve unlinkedAt")
    class DoubleRemovalScenarios {

        @Test
        @DisplayName("[US24] Comportamento atual: segunda remoção sobrescreve unlinkedAt (documenta o bug)")
        void removeStudentFromRoom_SecondRemoval_CurrentlyOverwritesUnlinkedAt() {
            // Arrange — membro já inativo com unlinkedAt da primeira remoção
            Instant originalUnlinkedAt = Instant.now().minusSeconds(3600);
            activeMember.setActive(false);
            activeMember.setUnlinkedAt(originalUnlinkedAt);

            when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
            when(roomMemberRepository.findByRoomIdAndUserId(ROOM_ID, STUDENT_ID))
                    .thenReturn(Optional.of(activeMember));
            when(roomMemberRepository.save(any(RoomMember.class))).thenAnswer(i -> i.getArgument(0));

            // Act (Segunda remoção — o código atual não verifica se já está inativo)
            roomService.removeStudentFromRoom(ROOM_ID, STUDENT_ID, TUTOR_ID);

            // Assert — documenta que o código atual SOBRESCREVE (comportamento atual, não desejado)
            ArgumentCaptor<RoomMember> captor = ArgumentCaptor.forClass(RoomMember.class);
            verify(roomMemberRepository).save(captor.capture());
            assertThat(captor.getValue().getUnlinkedAt())
                    .as("ACHADO US24-A4: O código atual sobrescreve unlinkedAt na segunda remoção " +
                        "perdendo a data real da saída")
                    .isNotEqualTo(originalUnlinkedAt);
        }

        @Disabled("Achado US24-A4: segunda remoção deve preservar o unlinkedAt original — " +
                  "correção: verificar isActive() antes de sobrescrever ou lançar exceção " +
                  "(IllegalArgumentException(\"Aluno não encontrado na sala\") se já inativo)")
        @Test
        @DisplayName("[US24] ESPERADO: segunda remoção deve preservar o unlinkedAt original da primeira remoção")
        void removeStudentFromRoom_SecondRemoval_ShouldPreserveOriginalUnlinkedAt() {
            // Arrange — membro já inativo com unlinkedAt conhecida
            Instant originalUnlinkedAt = Instant.now().minusSeconds(3600);
            activeMember.setActive(false);
            activeMember.setUnlinkedAt(originalUnlinkedAt);

            when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
            when(roomMemberRepository.findByRoomIdAndUserId(ROOM_ID, STUDENT_ID))
                    .thenReturn(Optional.of(activeMember));

            // Act (Segunda remoção)
            // O comportamento esperado: lançar exceção pois o aluno já foi removido
            assertThrows(
                    IllegalArgumentException.class,
                    () -> roomService.removeStudentFromRoom(ROOM_ID, STUDENT_ID, TUTOR_ID),
                    "Deveria lançar exceção ao tentar remover aluno já inativo, " +
                    "preservando o unlinkedAt original"
            );
            verify(roomMemberRepository, never()).save(any());
        }
    }
}
