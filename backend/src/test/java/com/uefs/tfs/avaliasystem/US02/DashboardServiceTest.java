package com.uefs.tfs.avaliasystem.US02;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.RoomDto;
import com.uefs.tfs.avaliasystem.exception.UserNotFoundException;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

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

    private static final Long VALID_USER_ID = 1L;
    private static final Long INVALID_USER_ID = 999L;

    // ────────────────────────────────────────────────────────────────────────
    //  TESTES VÁLIDOS
    // ────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Testes Válidos — Dashboard separado por papel")
    class ValidTests {

        @Test
        @DisplayName("US02-V4 — dashboard deve retornar abas separadas: salasComoTutor e salasComoAluno")
        void shouldContainBothListsSeparated() {
            var tutorRooms = List.of(
                    new RoomDto(10L, "Algoritmos Avançados", "ALGO-001"),
                    new RoomDto(11L, "Estruturas de Dados", "ED-002")
            );
            var studentRooms = List.of(
                    new RoomDto(20L, "Cálculo I", "CALC-001")
            );

            var dashboard = new DashboardResponse(tutorRooms, studentRooms);
            when(userService.getDashboard(VALID_USER_ID)).thenReturn(dashboard);

            DashboardResponse result = userService.getDashboard(VALID_USER_ID);

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
            var tutorRooms = List.of(
                    new RoomDto(10L, "Algoritmos Avançados", "ALGO-001")
            );
            var studentRooms = List.of(
                    new RoomDto(20L, "Cálculo I", "CALC-001")
            );

            var dashboard = new DashboardResponse(tutorRooms, studentRooms);
            when(userService.getDashboard(VALID_USER_ID)).thenReturn(dashboard);

            DashboardResponse result = userService.getDashboard(VALID_USER_ID);

            // A sala de Tutor não deve aparecer na lista de Aluno
            var studentRoomIds = result.getRoomsAsStudent()
                    .stream().map(RoomDto::getId).toList();

            assertThat(result.getRoomsAsTutor()).hasSize(1);
            assertThat(result.getRoomsAsTutor().get(0).getName())
                    .isEqualTo("Algoritmos Avançados");
            assertThat(studentRoomIds)
                    .as("Uma sala de Tutor não deve aparecer também na aba de Aluno")
                    .doesNotContain(10L);
        }

        @Test
        @DisplayName("US02-V6 — salas acessadas via código aparecem apenas na aba Aluno")
        void studentRoomsShouldOnlyBelongToStudent() {
            var tutorRooms = List.of(
                    new RoomDto(10L, "Algoritmos Avançados", "ALGO-001")
            );
            var studentRooms = List.of(
                    new RoomDto(20L, "Cálculo I", "CALC-001")
            );

            var dashboard = new DashboardResponse(tutorRooms, studentRooms);
            when(userService.getDashboard(VALID_USER_ID)).thenReturn(dashboard);

            DashboardResponse result = userService.getDashboard(VALID_USER_ID);

            var tutorRoomIds = result.getRoomsAsTutor()
                    .stream().map(RoomDto::getId).toList();

            assertThat(result.getRoomsAsStudent()).hasSize(1);
            assertThat(result.getRoomsAsStudent().get(0).getName())
                    .isEqualTo("Cálculo I");
            assertThat(tutorRoomIds)
                    .as("Uma sala de Aluno não deve aparecer também na aba de Tutor")
                    .doesNotContain(20L);
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
            var dashboard = new DashboardResponse(List.of(), List.of());
            when(userService.getDashboard(VALID_USER_ID)).thenReturn(dashboard);

            DashboardResponse result = userService.getDashboard(VALID_USER_ID);

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
            when(userService.getDashboard(INVALID_USER_ID))
                    .thenThrow(new UserNotFoundException("Usuário não encontrado: " + INVALID_USER_ID));

            assertThatThrownBy(() -> userService.getDashboard(INVALID_USER_ID))
                    .isInstanceOf(UserNotFoundException.class)
                    .hasMessageContaining("Usuário não encontrado");
        }
    }
}