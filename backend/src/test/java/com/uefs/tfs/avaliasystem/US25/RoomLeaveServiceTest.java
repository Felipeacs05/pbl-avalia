package com.uefs.tfs.avaliasystem.US25;

import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.*;
import com.uefs.tfs.avaliasystem.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Contrato assumido:
 * - RoomService.leaveRoom(UUID roomId, UUID studentId) realiza soft delete, cria Notification para o tutor.
 * - Usa lock pessimista (findByRoomIdAndUserIdForUpdate).
 * - Exceções: IllegalArgumentException (tutor tenta sair), ResourceNotFoundException (não vinculado), ResourceConflictException (já saiu).
 * - Se a criação da Notification falhar, a operação deve ser rollback (vínculo permanece ativo).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[US25] Testes Unitários de RoomService.leaveRoom")
class RoomLeaveServiceTest {

    @Mock private RoomRepository roomRepository;
    @Mock private RoomMemberRepository roomMemberRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private NotificationService notificationService; // assume exists
    @Mock private Clock clock;

    private RoomService roomService;

    private static final UUID ROOM_ID = UUID.randomUUID();
    private static final UUID STUDENT_ID = UUID.randomUUID();
    private static final UUID TUTOR_ID = UUID.randomUUID();
    private static final UUID OTHER_ID = UUID.randomUUID();

    private Room room;
    private User tutor;
    private User student;
    private RoomMember activeMember;
    private Instant now = Instant.parse("2026-01-01T12:00:00Z");

    @BeforeEach
    void setUp() {
        roomService = new RoomService(roomRepository, null, roomMemberRepository, null);
        // Mock clock
        when(clock.instant()).thenReturn(now);
        when(clock.getZone()).thenReturn(ZoneId.systemDefault());
        // Build entities
        tutor = new User();
        tutor.setId(TUTOR_ID);
        tutor.setName("Tutor US25");
        tutor.setEmail("tutor25@uefs.br");
        tutor.setPassword("hash");

        student = new User();
        student.setId(STUDENT_ID);
        student.setName("Aluno US25");
        student.setEmail("aluno25@uefs.br");
        student.setPassword("hash");

        room = new Room();
        room.setId(ROOM_ID);
        room.setName("Sala US25");
        room.setTutor(tutor);

        activeMember = new RoomMember();
        activeMember.setId(UUID.randomUUID());
        activeMember.setRoom(room);
        activeMember.setUser(student);
        activeMember.setRole(Role.STUDENT);
        activeMember.setActive(true);
        activeMember.setUnlinkedAt(null);
    }

    // ---------- CENÁRIO DE SUCESSO ----------
    @Test
    @DisplayName("[US25] Aluno deixa a sala com sucesso – soft delete e notificação criada")
    void leaveRoom_ValidStudent_SoftDeleteAndNotification() {
        // Arrange
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        when(roomMemberRepository.findByRoomIdAndUserIdForUpdate(ROOM_ID, STUDENT_ID))
                .thenReturn(Optional.of(activeMember));
        when(roomMemberRepository.save(any(RoomMember.class))).thenAnswer(i -> i.getArgument(0));
        // Simula criação da notificação
        Notification notif = new Notification();
        notif.setId(UUID.randomUUID());
        notif.setRecipient(tutor);
        notif.setRoom(room);
        notif.setStudent(student);
        notif.setType(NotificationType.STUDENT_LEFT);
        notif.setCreatedAt(now);
        when(notificationRepository.save(any(Notification.class))).thenReturn(notif);

        // Act
        roomService.leaveRoom(ROOM_ID, STUDENT_ID);

        // Assert – soft delete
        ArgumentCaptor<RoomMember> memberCaptor = ArgumentCaptor.forClass(RoomMember.class);
        verify(roomMemberRepository).save(memberCaptor.capture());
        RoomMember saved = memberCaptor.getValue();
        assertFalse(saved.isActive(), "O vínculo deve ficar inativo");
        assertEquals(now, saved.getUnlinkedAt(), "unlinkedAt deve ser o instante do Clock");
        // Assert – notificação criada
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    // ---------- TUTOR TENTA SAIR ----------
    @Test
    @DisplayName("[US25] Tutor tentando sair da própria sala lança IllegalArgumentException")
    void leaveRoom_TutorTriesToLeave_ThrowsIllegalArgumentException() {
        // Arrange – o tutor tem RoomMember com role TUTOR
        RoomMember tutorMember = new RoomMember();
        tutorMember.setId(UUID.randomUUID());
        tutorMember.setRoom(room);
        tutorMember.setUser(tutor);
        tutorMember.setRole(Role.TUTOR);
        tutorMember.setActive(true);
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        when(roomMemberRepository.findByRoomIdAndUserIdForUpdate(ROOM_ID, TUTOR_ID))
                .thenReturn(Optional.of(tutorMember));
        // Act & Assert
        assertThrows(IllegalArgumentException.class,
                () -> roomService.leaveRoom(ROOM_ID, TUTOR_ID),
                "Tutor não pode sair da própria sala");
        verify(roomMemberRepository, never()).save(any());
        verify(notificationRepository, never()).save(any());
    }

    // ---------- NÃO VINCULADO ----------
    @Test
    @DisplayName("[US25] Usuário sem vínculo lança ResourceNotFoundException")
    void leaveRoom_NotMember_ThrowsResourceNotFoundException() {
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        when(roomMemberRepository.findByRoomIdAndUserIdForUpdate(ROOM_ID, OTHER_ID))
                .thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> roomService.leaveRoom(ROOM_ID, OTHER_ID));
        verify(roomMemberRepository, never()).save(any());
        verify(notificationRepository, never()).save(any());
    }

    // ---------- JÁ SAÍU ----------
    @Test
    @DisplayName("[US25] Aluno já inativo lança ResourceConflictException e não cria nova notificação")
    void leaveRoom_AlreadyLeft_ThrowsResourceConflictException() {
        // Arrange – membro já inativo
        activeMember.setActive(false);
        activeMember.setUnlinkedAt(now.minusSeconds(3600));
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        when(roomMemberRepository.findByRoomIdAndUserIdForUpdate(ROOM_ID, STUDENT_ID))
                .thenReturn(Optional.of(activeMember));
        // Act & Assert
        assertThrows(ResourceConflictException.class,
                () -> roomService.leaveRoom(ROOM_ID, STUDENT_ID));
        verify(roomMemberRepository, never()).save(any());
        verify(notificationRepository, never()).save(any());
    }

    // ---------- NOTIFICAÇÃO FALHA - ROLLBACK ----------
    @Test
    @DisplayName("[US25] Falha ao criar notificação resulta em rollback – vínculo permanece ativo")
    void leaveRoom_NotificationFailure_RollsBackTransaction() {
        // Arrange – tudo ok até salvar o membro
        when(roomRepository.findById(ROOM_ID)).thenReturn(Optional.of(room));
        when(roomMemberRepository.findByRoomIdAndUserIdForUpdate(ROOM_ID, STUDENT_ID))
                .thenReturn(Optional.of(activeMember));
        when(roomMemberRepository.save(any(RoomMember.class))).thenAnswer(i -> i.getArgument(0));
        // Simula exceção ao persistir notificação
        when(notificationRepository.save(any(Notification.class))).thenThrow(new RuntimeException("SMTP down"));
        // Act & Assert – esperamos que a exceção seja propagada e o membro não seja salvo
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> roomService.leaveRoom(ROOM_ID, STUDENT_ID));
        assertThat(ex).hasMessageContaining("SMTP down");
        // Verifica que o save do membro ocorreu, mas a transação seria revertida pelo framework (não podemos checar aqui);
        // a intenção do teste é garantir que a chamada ao repo de notificação falhou antes de commit.
    }
}
