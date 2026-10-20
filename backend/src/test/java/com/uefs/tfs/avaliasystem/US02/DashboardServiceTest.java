package com.uefs.tfs.avaliasystem.US02;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.RoomDto;
import com.uefs.tfs.avaliasystem.exception.UserNotFoundException;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.RoomService;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * US02 — Dashboard de Salas.
 *
 * Testa a separação visual/lógica entre salas administradas (Tutor)
 * e salas nas quais o usuário é Aluno no dashboard retornado pelo serviço.
 *
 * Testes válidos:
 *   - Dashboard retorna listas separadas de salas Tutor e Aluno.
 *   - Cada lista contém apenas as salas do papel correto.
 *
 * Testes inválidos:
 *   - Usuário sem salas recebe listas vazias (não nulas).
 *   - Acesso com ID de usuário inválido lança exceção adequada.
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private UserService userService;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RoomService roomService;

    private static final UUID VALID_USER_ID = UUID.randomUUID();
    private static final UUID INVALID_USER_ID = UUID.randomUUID();
    private static final UUID OTHER_TUTOR_ID = UUID.randomUUID();

    private static final UUID TUTOR_ROOM_ID = UUID.randomUUID();
    private static final UUID TUTOR_ROOM_ID_2 = UUID.randomUUID();
    private static final UUID STUDENT_ROOM_ID = UUID.randomUUID();

    // ────────────────────────────────────────────────────────────────────────
    //  TESTES VÁLIDOS
    // ────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Testes Válidos — Dashboard separado por papel")
    class ValidTests {

        @Test
        @DisplayName("US02-V4 — dashboard deve retornar abas separadas: salasComoTutor e salasComoAluno")
        void shouldContainBothListsSeparated() {
            var user = new User(VALID_USER_ID, "Usuário", "usuario@example.com", "senha", null);
            var otherTutor = new User(OTHER_TUTOR_ID, "Outro tutor", "tutor@example.com", "senha", null);
            var tutorRooms = List.of(
                    room(TUTOR_ROOM_ID, "Algoritmos Avançados", "ALGO-001", user),
                    room(TUTOR_ROOM_ID_2, "Estruturas de Dados", "ED-002", user)
            );
            var studentRooms = List.of(
                    room(STUDENT_ROOM_ID, "Cálculo I", "CALC-001", otherTutor)
            );

            when(userRepository.existsById(VALID_USER_ID)).thenReturn(true);
            when(roomRepository.findByTutorId(VALID_USER_ID)).thenReturn(tutorRooms);
            when(roomRepository.findRoomsByParticipantId(VALID_USER_ID)).thenReturn(studentRooms);

            DashboardResponse result = roomService.getDashboardByUser(VALID_USER_ID);

            // Ambas as seções devem existir e não serem nulas
            assertThat(result.getRoomsAsTutor())
                    .as("A aba 'Salas que administro (Tutor)' deve existir no dashboard")
                    .isNotNull();
            assertThat(result.getRoomsAsStudent())
                    .as("A aba 'Salas que participo (Aluno)' deve existir no dashboard")
                    .isNotNull();
        }

        @Test
        @DisplayName("US02-V5 — salas criadas pelo usuário aparecem apenas na aba Tutor")
        void tutorRoomsShouldOnlyBelongToTutor() {
            var user = new User(VALID_USER_ID, "Usuário", "usuario@example.com", "senha", null);
            var otherTutor = new User(OTHER_TUTOR_ID, "Outro tutor", "tutor@example.com", "senha", null);
            var tutorRooms = List.of(
                    room(TUTOR_ROOM_ID, "Algoritmos Avançados", "ALGO-001", user)
            );
            var studentRooms = List.of(
                    room(STUDENT_ROOM_ID, "Cálculo I", "CALC-001", otherTutor)
            );

            when(userRepository.existsById(VALID_USER_ID)).thenReturn(true);
            when(roomRepository.findByTutorId(VALID_USER_ID)).thenReturn(tutorRooms);
            when(roomRepository.findRoomsByParticipantId(VALID_USER_ID)).thenReturn(studentRooms);

            DashboardResponse result = roomService.getDashboardByUser(VALID_USER_ID);

            // A sala de Tutor não deve aparecer na lista de Aluno
            var studentRoomIds = result.getRoomsAsStudent()
                    .stream().map(RoomDto::getId).toList();

            assertThat(result.getRoomsAsTutor()).hasSize(1);
            assertThat(result.getRoomsAsTutor().get(0).getName())
                    .isEqualTo("Algoritmos Avançados");
            assertThat(studentRoomIds)
                    .as("Uma sala de Tutor não deve aparecer também na aba de Aluno")
                    .doesNotContain(TUTOR_ROOM_ID);
        }

        @Test
        @DisplayName("US02-V6 — salas acessadas via código aparecem apenas na aba Aluno")
        void studentRoomsShouldOnlyBelongToStudent() {
            var user = new User(VALID_USER_ID, "Usuário", "usuario@example.com", "senha", null);
            var otherTutor = new User(OTHER_TUTOR_ID, "Outro tutor", "tutor@example.com", "senha", null);
            var tutorRooms = List.of(
                    room(TUTOR_ROOM_ID, "Algoritmos Avançados", "ALGO-001", user)
            );
            var studentRooms = List.of(
                    room(STUDENT_ROOM_ID, "Cálculo I", "CALC-001", otherTutor)
            );

            when(userRepository.existsById(VALID_USER_ID)).thenReturn(true);
            when(roomRepository.findByTutorId(VALID_USER_ID)).thenReturn(tutorRooms);
            when(roomRepository.findRoomsByParticipantId(VALID_USER_ID)).thenReturn(studentRooms);

            DashboardResponse result = roomService.getDashboardByUser(VALID_USER_ID);

            var tutorRoomIds = result.getRoomsAsTutor()
                    .stream().map(RoomDto::getId).toList();

            assertThat(result.getRoomsAsStudent()).hasSize(1);
            assertThat(result.getRoomsAsStudent().get(0).getName())
                    .isEqualTo("Cálculo I");
            assertThat(tutorRoomIds)
                    .as("Uma sala de Aluno não deve aparecer também na aba de Tutor")
                    .doesNotContain(STUDENT_ROOM_ID);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  TESTES INVÁLIDOS
    // ────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Testes Inválidos — Dashboard com dados ausentes ou acesso indevido")
    class InvalidTests {

        @Test
        @DisplayName("US02-I6 — usuário sem salas deve receber listas vazias (não nulas) no dashboard")
        void userWithoutRoomsShouldReceiveEmptyLists() {
            when(userRepository.existsById(VALID_USER_ID)).thenReturn(true);
            when(roomRepository.findByTutorId(VALID_USER_ID)).thenReturn(List.of());
            when(roomRepository.findRoomsByParticipantId(VALID_USER_ID)).thenReturn(List.of());

            DashboardResponse result = roomService.getDashboardByUser(VALID_USER_ID);

            assertThat(result.getRoomsAsTutor())
                    .as("Lista de salas Tutor deve ser vazia, nunca nula")
                    .isNotNull()
                    .isEmpty();

            assertThat(result.getRoomsAsStudent())
                    .as("Lista de salas Aluno deve ser vazia, nunca nula")
                    .isNotNull()
                    .isEmpty();
        }

        @Test
        @DisplayName("US02-I7 — acesso ao dashboard com ID de usuário inválido deve lançar exceção")
        void accessWithInvalidIdShouldThrowException() {
            when(userRepository.existsById(INVALID_USER_ID)).thenReturn(false);

            assertThatThrownBy(() -> roomService.getDashboardByUser(INVALID_USER_ID))
                    .isInstanceOf(UserNotFoundException.class)
                    .hasMessageContaining("User not found");
        }
    }

    private static Room room(UUID id, String name, String accessCode, User tutor) {
        Room room = new Room();
        room.setId(id);
        room.setName(name);
        room.setAccessCode(accessCode);
        room.setTutor(tutor);
        return room;
    }
}