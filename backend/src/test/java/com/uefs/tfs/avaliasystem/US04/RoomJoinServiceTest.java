package com.uefs.tfs.avaliasystem.US04;

import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidAccessCodeException;
import com.uefs.tfs.avaliasystem.exception.TooManyAttemptsException;
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
import org.junit.jupiter.api.DisplayName;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * US04 — regras de negócio do ingresso (código digitado e link de convite usam o mesmo joinRoom).
 * Assinatura assumida: RoomResponse joinRoom(String userId, String accessCode, String ip).
 * O papel "Aluno" é o Role.STUDENT do RoomMember (papel é por sala, não do User).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("US04 - RoomService.joinRoom")
class RoomJoinServiceTest {

    private static final String IP = "192.168.1.1";
    private static final String CODE = "A1B2C3";
    private static final String ROOM_ID = "987e6543-e21b-12d3-a456-426614174000";
    private static final String TUTOR_ID = "123e4567-e89b-12d3-a456-426614174000";
    private static final String STUDENT_ID = "555e4567-e89b-12d3-a456-426614174000";

    @Mock private RoomRepository roomRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoomMemberRepository roomMemberRepository;
    @Mock private RateLimitingService rateLimitingService;

    @InjectMocks
    private RoomService roomService;

    private User tutor;
    private User student;
    private Room room;

    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setId(UUID.fromString(TUTOR_ID));
        student = new User();
        student.setId(UUID.fromString(STUDENT_ID));

        room = new Room();
        room.setId(ROOM_ID);
        room.setName("Math Room");
        room.setAccessCode(CODE);
        room.setInviteLink("app/join/" + CODE);
        room.setTutor(tutor);

        when(rateLimitingService.isIpBlocked(IP)).thenReturn(false);
        when(roomRepository.findByAccessCode(CODE)).thenReturn(Optional.of(room));
        when(userRepository.findById(UUID.fromString(STUDENT_ID))).thenReturn(Optional.of(student));
        when(userRepository.findById(UUID.fromString(TUTOR_ID))).thenReturn(Optional.of(tutor));
        when(roomMemberRepository.findByRoomIdAndUserId(any(), any())).thenReturn(Optional.empty());
        when(roomMemberRepository.save(any(RoomMember.class))).thenAnswer(i -> i.getArgument(0));
    }

    // ───────── VÁLIDOS ─────────

    @Test
    @DisplayName("código correto vincula o usuário à sala como STUDENT ativo (persistido)")
    void shouldBindUserToRoomAsStudentWhenCodeIsCorrect() {
        RoomResponse response = roomService.joinRoom(STUDENT_ID, CODE, IP);

        ArgumentCaptor<RoomMember> captor = ArgumentCaptor.forClass(RoomMember.class);
        verify(roomMemberRepository, times(1)).save(captor.capture());
        RoomMember saved = captor.getValue();

        assertEquals(Role.STUDENT, saved.getRole());
        assertTrue(saved.isActive());
        assertNull(saved.getUnlinkedAt());
        assertSame(room, saved.getRoom());
        assertSame(student, saved.getUser());
        assertEquals(ROOM_ID, response.getId());

        verify(rateLimitingService).resetFailedAttempts(IP);
        verify(rateLimitingService, never()).registerFailedAttempt(anyString());
    }

    @Test
    @DisplayName("código é normalizado (trim + maiúsculas) antes da busca")
    void shouldNormalizeCode() {
        roomService.joinRoom(STUDENT_ID, "  a1b2c3 ", IP);

        verify(roomRepository).findByAccessCode(CODE);
        verify(roomMemberRepository).save(any(RoomMember.class));
    }

    @Test
    @DisplayName("já membro ativo: não duplica o vínculo")
    void shouldNotDuplicateBindingWhenUserIsAlreadyMember() {
        RoomMember existing = new RoomMember();
        existing.setRoom(room);
        existing.setUser(student);
        existing.setRole(Role.STUDENT);
        existing.setActive(true);
        when(roomMemberRepository.findByRoomIdAndUserId(ROOM_ID, UUID.fromString(STUDENT_ID)))
                .thenReturn(Optional.of(existing));

        roomService.joinRoom(STUDENT_ID, CODE, IP);

        verify(roomMemberRepository, never()).save(any(RoomMember.class));
    }

    @Test
    @DisplayName("ex-membro (soft delete) é reativado na mesma linha, sem criar outra")
    void shouldReactivateInactiveMembership() {
        RoomMember inactive = new RoomMember();
        inactive.setRoom(room);
        inactive.setUser(student);
        inactive.setRole(Role.STUDENT);
        inactive.setActive(false);
        inactive.setUnlinkedAt(Instant.now());
        when(roomMemberRepository.findByRoomIdAndUserId(ROOM_ID, UUID.fromString(STUDENT_ID)))
                .thenReturn(Optional.of(inactive));

        roomService.joinRoom(STUDENT_ID, CODE, IP);

        ArgumentCaptor<RoomMember> captor = ArgumentCaptor.forClass(RoomMember.class);
        verify(roomMemberRepository).save(captor.capture());
        assertSame(inactive, captor.getValue());
        assertTrue(inactive.isActive());
        assertNull(inactive.getUnlinkedAt());
    }

    // ───────── INVÁLIDOS ─────────

    @Test
    @DisplayName("código inexistente: lança InvalidAccessCodeException, conta 1 falha e não vincula ninguém")
    void shouldRegisterFailedAttemptAndThrowWhenCodeDoesNotExist() {
        when(roomRepository.findByAccessCode("WRONG1")).thenReturn(Optional.empty());

        assertThrows(InvalidAccessCodeException.class, () -> roomService.joinRoom(STUDENT_ID, "WRONG1", IP));

        verify(rateLimitingService).registerFailedAttempt(IP);
        verify(rateLimitingService, never()).resetFailedAttempts(anyString());
        verify(roomMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("IP bloqueado: TooManyAttemptsException sem consultar sala nem contar nova falha")
    void shouldThrowTooManyAttemptsWhenIpIsBlocked() {
        when(rateLimitingService.isIpBlocked(IP)).thenReturn(true);

        assertThrows(TooManyAttemptsException.class, () -> roomService.joinRoom(STUDENT_ID, CODE, IP));

        verify(roomRepository, never()).findByAccessCode(anyString());
        verify(rateLimitingService, never()).registerFailedAttempt(anyString());
    }

    @Test
    @DisplayName("IP bloqueado não ingressa nem com o código correto (nenhum vínculo gravado)")
    void shouldNotBindUserWhenIpIsBlockedEvenWithCorrectCode() {
        when(rateLimitingService.isIpBlocked(IP)).thenReturn(true);

        assertThrows(TooManyAttemptsException.class, () -> roomService.joinRoom(STUDENT_ID, CODE, IP));

        verify(roomMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("código em branco/nulo é rejeitado sem consultar o banco")
    void shouldRejectBlankOrNullCode() {
        assertThrows(InvalidAccessCodeException.class, () -> roomService.joinRoom(STUDENT_ID, "  ", IP));
        assertThrows(InvalidAccessCodeException.class, () -> roomService.joinRoom(STUDENT_ID, null, IP));

        verify(roomRepository, never()).findByAccessCode(any());
        verify(roomMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tutor não pode ingressar como Aluno na própria sala")
    void tutorCannotJoinOwnRoomAsStudent() {
        assertThrows(IllegalArgumentException.class, () -> roomService.joinRoom(TUTOR_ID, CODE, IP));

        verify(roomMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("usuário autenticado inexistente não é vinculado")
    void unknownUserIsRejected() {
        String unknown = "00000000-0000-0000-0000-000000000000";
        when(userRepository.findById(UUID.fromString(unknown))).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> roomService.joinRoom(unknown, CODE, IP));

        verify(roomMemberRepository, never()).save(any());
    }
}