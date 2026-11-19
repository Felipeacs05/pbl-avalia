package com.uefs.tfs.avaliasystem.US22.US25;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.RoomController;
import com.uefs.tfs.avaliasystem.exception.ResourceConflictException;
import com.uefs.tfs.avaliasystem.exception.ResourceNotFoundException;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.RoomService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoomController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US25] Controller - POST /api/v1/rooms/{roomId}/leave")
class RoomLeaveControllerTest {

    private static final String URL = "/api/v1/rooms/{roomId}/leave";
    private static final UUID ROOM = UUID.fromString("987e6543-e21b-12d3-a456-426614174000");
    private static final UUID STUDENT = UUID.fromString("555e4567-e89b-12d3-a456-426614174000");

    @MockitoBean private UserRepository userRepository;
    @MockitoBean private RoomService roomService;
    @Autowired private MockMvc mockMvc;

    @Test
    @DisplayName("204 e encaminha roomId da URL e usuário do JWT ao Service")
    void shouldReturn204AndForwardJwtUser() throws Exception {
        mockMvc.perform(post(URL, ROOM).with(jwt().jwt(j -> j.subject(STUDENT.toString()))))
                .andExpect(status().isNoContent());

        verify(roomService, times(1)).leaveRoom(ROOM, STUDENT);
    }

    @Test
    @DisplayName("401 sem token e Service não é acionado")
    void shouldReturn401WithoutToken() throws Exception {
        mockMvc.perform(post(URL, ROOM)).andExpect(status().isUnauthorized());

        verify(roomService, never()).leaveRoom(any(), any());
    }

    @Test
    @DisplayName("usuário enviado no corpo é ignorado: vale o do JWT")
    void shouldIgnoreUserSentInBody() throws Exception {
        UUID fake = UUID.randomUUID();
        mockMvc.perform(post(URL, ROOM).with(jwt().jwt(j -> j.subject(STUDENT.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"" + fake + "\",\"userId\":\"" + fake + "\"}"))
                .andExpect(status().isNoContent());

        verify(roomService).leaveRoom(ROOM, STUDENT);
        verify(roomService, never()).leaveRoom(any(), eq(fake));
    }

    @Test
    @DisplayName("IllegalArgumentException (tutor saindo da própria sala) -> 400")
    void shouldMapIllegalArgumentTo400() throws Exception {
        doThrow(new IllegalArgumentException("Tutor não pode sair da própria sala"))
                .when(roomService).leaveRoom(ROOM, STUDENT);

        mockMvc.perform(post(URL, ROOM).with(jwt().jwt(j -> j.subject(STUDENT.toString()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Tutor não pode sair da própria sala"));
    }

    @Test
    @DisplayName("ResourceNotFoundException (não vinculado) -> 404")
    void shouldMapNotFoundTo404() throws Exception {
        doThrow(new ResourceNotFoundException("O aluno não pertence à sala informada"))
                .when(roomService).leaveRoom(ROOM, STUDENT);

        mockMvc.perform(post(URL, ROOM).with(jwt().jwt(j -> j.subject(STUDENT.toString()))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("ResourceConflictException (já saiu) -> 409")
    void shouldMapConflictTo409() throws Exception {
        doThrow(new ResourceConflictException("O aluno já saiu desta sala"))
                .when(roomService).leaveRoom(ROOM, STUDENT);

        mockMvc.perform(post(URL, ROOM).with(jwt().jwt(j -> j.subject(STUDENT.toString()))))
                .andExpect(status().isConflict());
    }

    /** ACHADO esperado: GlobalExceptionHandler tem catch-all Exception -> 500 para MethodArgumentTypeMismatchException. */
    @Test
    @DisplayName("roomId malformado -> 400 e Service não é acionado [pode falhar: ver GlobalExceptionHandler]")
    void shouldReturn400ForMalformedRoomId() throws Exception {
        mockMvc.perform(post(URL, "nao-e-uuid").with(jwt().jwt(j -> j.subject(STUDENT.toString()))))
                .andExpect(status().isBadRequest());

        verify(roomService, never()).leaveRoom(any(), any());
    }
}