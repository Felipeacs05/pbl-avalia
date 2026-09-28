package com.uefs.tfs.avaliasystem.US03;

import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

    @InjectMocks
    private RoomService roomService;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private UserRepository userRepository;

    @Captor
    private ArgumentCaptor<Room> roomCaptor;

    private User tutorUser;
    private Room existingRoom;

    private final String TUTOR_UUID = "123e4567-e89b-12d3-a456-426614174000";
    private final String ROOM_UUID = "987e6543-e21b-12d3-a456-426614174000";

    @BeforeEach
    void setUp() {
        tutorUser = new User();
        // Caso seu User.setId espere UUID:
        tutorUser.setId(UUID.fromString(TUTOR_UUID));
        tutorUser.setName("Tutor Teste");

        existingRoom = new Room();
        existingRoom.setId(ROOM_UUID);
        existingRoom.setName("Módulo Antigo");
        existingRoom.setAccessCode("A1B2C");
        existingRoom.setInviteLink("app/join/A1B2C");
        existingRoom.setTutor(tutorUser);
    }

    // --- TESTES DE CRIAÇÃO ---

    @Test
    @DisplayName("Deve criar sala com nome, código único e link de convite, associando o tutor (UUID)")
    void createRoom_WithValidData_AppliesBusinessRulesAndSaves() {
        RoomRequest request = new RoomRequest("Módulo de Engenharia de Software");

        Mockito.when(userRepository.findById(any())).thenReturn(Optional.of(tutorUser));
        Mockito.when(roomRepository.save(any(Room.class))).thenAnswer(i -> i.getArgument(0));

        RoomResponse response = roomService.createRoom(request, TUTOR_UUID);

        Mockito.verify(roomRepository).save(roomCaptor.capture());
        Room capturedRoom = roomCaptor.getValue();

        assertEquals("Módulo de Engenharia de Software", capturedRoom.getName());
        assertNotNull(capturedRoom.getTutor());
        // Ajustado para converter para String na asserção
        assertEquals(TUTOR_UUID, capturedRoom.getTutor().getId().toString());

        assertNotNull(capturedRoom.getAccessCode());
        assertFalse(capturedRoom.getAccessCode().isBlank());

        assertNotNull(capturedRoom.getInviteLink());
        assertTrue(capturedRoom.getInviteLink().contains(capturedRoom.getAccessCode()));

        assertTrue(response.getJoinLink().startsWith("app/join/"));
    }

    @Test
    @DisplayName("Deve lançar exceção ao tentar criar sala com um utilizador (Tutor) inexistente")
    void createRoom_WithInvalidTutorId_ThrowsException() {
        String invalidTutorUuid = "00000000-0000-0000-0000-000000000000";
        RoomRequest request = new RoomRequest("Módulo Válido");

        Mockito.when(userRepository.findById(any())).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            roomService.createRoom(request, invalidTutorUuid);
        });

        assertEquals("Utilizador não encontrado para assumir o papel de Tutor.", exception.getMessage());
        Mockito.verify(roomRepository, Mockito.never()).save(any(Room.class));
    }

    // --- TESTES DE EDIÇÃO ---

    @Test
    @DisplayName("Deve editar a sala atualizando apenas o nome e salvando no repositório")
    void updateRoom_WithValidDataAndCorrectTutor_UpdatesAndSaves() {
        RoomRequest updateRequest = new RoomRequest("Módulo Atualizado");

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(existingRoom));
        Mockito.when(roomRepository.save(any(Room.class))).thenAnswer(i -> i.getArgument(0));

        roomService.updateRoom(ROOM_UUID, updateRequest, TUTOR_UUID);

        Mockito.verify(roomRepository).save(roomCaptor.capture());
        Room capturedRoom = roomCaptor.getValue();

        assertEquals("Módulo Atualizado", capturedRoom.getName());
        assertEquals("A1B2C", capturedRoom.getAccessCode());
        assertEquals("app/join/A1B2C", capturedRoom.getInviteLink());
        // Ajustado para converter para String na asserção
        assertEquals(TUTOR_UUID, capturedRoom.getTutor().getId().toString());
    }

    @Test
    @DisplayName("Deve impedir a edição e disparar exceção se o utilizador não for o Tutor da sala")
    void updateRoom_UserIsNotTutor_ThrowsException() {
        RoomRequest updateRequest = new RoomRequest("Módulo Hackeado");
        String unauthorizedUuid = "999e9999-e99b-99d9-a999-999999999999";

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(existingRoom));

        SecurityException exception = assertThrows(SecurityException.class, () -> {
            roomService.updateRoom(ROOM_UUID, updateRequest, unauthorizedUuid);
        });

        assertEquals("Apenas o Tutor da sala possui permissão para editá-la.", exception.getMessage());
        Mockito.verify(roomRepository, Mockito.never()).save(any(Room.class));
    }

    // --- TESTES DE EXCLUSÃO ---

    @Test
    @DisplayName("Deve excluir a sala corretamente do repositório caso o utilizador seja o Tutor")
    void deleteRoom_WithValidTutor_DeletesFromRepository() {
        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(existingRoom));

        roomService.deleteRoom(ROOM_UUID, TUTOR_UUID);

        Mockito.verify(roomRepository, Mockito.times(1)).delete(existingRoom);
    }

    @Test
    @DisplayName("Deve impedir a exclusão e disparar exceção se o utilizador não for o Tutor")
    void deleteRoom_UserIsNotTutor_ThrowsException() {
        String unauthorizedUuid = "999e9999-e99b-99d9-a999-999999999999";
        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(existingRoom));

        SecurityException exception = assertThrows(SecurityException.class, () -> {
            roomService.deleteRoom(ROOM_UUID, unauthorizedUuid);
        });

        assertEquals("Apenas o Tutor da sala possui permissão para excluí-la.", exception.getMessage());
        Mockito.verify(roomRepository, Mockito.never()).delete(any(Room.class));
    }
}