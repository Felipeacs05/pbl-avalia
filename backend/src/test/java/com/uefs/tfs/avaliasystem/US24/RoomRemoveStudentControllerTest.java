package com.uefs.tfs.avaliasystem.US24;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.RoomController;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.RoomService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato assumido:
 * - Controller: RoomController
 * - DELETE /api/v1/rooms/{roomId}/members/{studentId}  -> 204 No Content
 * - DELETE /api/v1/rooms/{roomId}/students/{studentId} -> 204 No Content (alias)
 * - @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)") -> 403 se false
 * - 401 sem JWT
 * - UUID malformado -> 400 Bad Request (MethodArgumentTypeMismatchException)
 * - Mock de roomSecurity bean via @MockitoBean(name="roomSecurity")
 */
@WebMvcTest(RoomController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US24] Testes da Camada Web (RoomController — removeStudentFromRoom)")
class RoomRemoveStudentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private RoomService roomService;

    @MockitoBean(name = "roomSecurity")
    private com.uefs.tfs.avaliasystem.security.RoomSecurity roomSecurity;

    private static final UUID ROOM_ID    = UUID.randomUUID();
    private static final UUID STUDENT_ID = UUID.randomUUID();
    private static final UUID TUTOR_ID   = UUID.randomUUID();

    private static final String MEMBERS_URL  = "/api/v1/rooms/{roomId}/members/{studentId}";
    private static final String STUDENTS_URL = "/api/v1/rooms/{roomId}/students/{studentId}";

    // ─────────────── CENÁRIOS VÁLIDOS ───────────────

    @Test
    @DisplayName("[US24] DELETE /rooms/{id}/members/{id} com tutor dono retorna 204 No Content")
    void removeStudent_ValidTutor_Returns204NoContent() throws Exception {
        // Arrange (isOwner=true)
        when(roomSecurity.isOwner(eq(ROOM_ID), any())).thenReturn(true);

        // Act & Assert
        mockMvc.perform(delete(MEMBERS_URL, ROOM_ID, STUDENT_ID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_ID.toString()))))
                .andExpect(status().isNoContent());

        verify(roomService).removeStudentFromRoom(ROOM_ID, STUDENT_ID, TUTOR_ID);
    }

    @Test
    @DisplayName("[US24] Alias /rooms/{id}/students/{id} deve funcionar de forma equivalente ao /members/{id}")
    void removeStudent_AliasStudentsUrl_Returns204NoContent() throws Exception {
        // Arrange
        when(roomSecurity.isOwner(eq(ROOM_ID), any())).thenReturn(true);

        // Act & Assert (alias é funcionalmente idêntico)
        mockMvc.perform(delete(STUDENTS_URL, ROOM_ID, STUDENT_ID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_ID.toString()))))
                .andExpect(status().isNoContent());

        verify(roomService).removeStudentFromRoom(ROOM_ID, STUDENT_ID, TUTOR_ID);
    }

    // ─────────────── CENÁRIOS INVÁLIDOS (SEGURANÇA) ───────────────

    @Test
    @DisplayName("[US24] DELETE /rooms/{id}/members/{id} com isOwner=false retorna 403 e não chama service")
    void removeStudent_IsOwnerFalse_Returns403AndNeverCallsService() throws Exception {
        // Arrange (tutor de outra sala — @PreAuthorize bloqueia antes de chegar ao service)
        when(roomSecurity.isOwner(any(), any())).thenReturn(false);

        // Act & Assert
        mockMvc.perform(delete(MEMBERS_URL, ROOM_ID, STUDENT_ID)
                        .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString()))))
                .andExpect(status().isForbidden());

        verify(roomService, never()).removeStudentFromRoom(any(), any(), any());
    }

    @Test
    @DisplayName("[US24] DELETE /rooms/{id}/members/{id} sem token JWT retorna 401 Unauthorized")
    void removeStudent_NoJwtToken_Returns401Unauthorized() throws Exception {
        // Act & Assert (sem autenticação)
        mockMvc.perform(delete(MEMBERS_URL, ROOM_ID, STUDENT_ID))
                .andExpect(status().isUnauthorized());

        verify(roomService, never()).removeStudentFromRoom(any(), any(), any());
    }

    @Test
    @DisplayName("[US24] UUID malformado em roomId retorna 400 Bad Request")
    void removeStudent_MalformedRoomUuid_Returns400BadRequest() throws Exception {
        // Act & Assert (UUID inválido no path)
        mockMvc.perform(delete("/api/v1/rooms/nao-e-um-uuid/members/{studentId}", STUDENT_ID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_ID.toString()))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("[US24] UUID malformado em studentId retorna 400 Bad Request")
    void removeStudent_MalformedStudentUuid_Returns400BadRequest() throws Exception {
        // Arrange
        when(roomSecurity.isOwner(any(), any())).thenReturn(true);

        // Act & Assert
        mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/nao-e-uuid", ROOM_ID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_ID.toString()))))
                .andExpect(status().isBadRequest());
    }

    // ─────────────── HELPER LOCAL ───────────────

    private static <T> T eq(T value) {
        return org.mockito.ArgumentMatchers.eq(value);
    }
}
