package com.uefs.tfs.avaliasystem.US04;

import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.RoomController;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidAccessCodeException;
import com.uefs.tfs.avaliasystem.exception.TooManyAttemptsException;
import com.uefs.tfs.avaliasystem.service.RoomService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import com.uefs.tfs.avaliasystem.TestConfig;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RoomController.class)
@Import(SecurityConfig.class)
@TestConfig
class RoomJoinControllerTest {

    private static final String IP = "192.168.1.1";
    private static final UUID USER = UUID.fromString("555e4567-e89b-12d3-a456-426614174000");
    private static final UUID IDROOM = UUID.randomUUID(); // CORREÇÃO 1: Instanciação válida de UUID

    @Autowired private MockMvc mockMvc;
    @MockitoBean private RoomService roomService;

    private RoomResponse ok() {


        return new RoomResponse(IDROOM, "Math Room", "A1B2C3", "app/join/A1B2C3");
    }

    // ───────── VÁLIDOS ─────────

    @Test
    void shouldReturnOkWhenJoiningViaCorrectCode() throws Exception {
        when(roomService.joinRoom(USER, "A1B2C3", IP)).thenReturn(ok());


        mockMvc.perform(post("/api/v1/rooms/join").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"A1B2C3\"}")
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("A1B2C3")); // CORREÇÃO 3: Ajustado para $.accessCode
    }

    @Test
    void shouldReturnOkWhenJoiningViaInviteLink() throws Exception {
        when(roomService.joinRoom(USER, "A1B2C3", IP)).thenReturn(ok());

        mockMvc.perform(post("/api/v1/rooms/join/A1B2C3").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joinLink").value("app/join/A1B2C3"));
    }

    @Test
    @DisplayName("X-Forwarded-For com vários proxies: usa o primeiro IP (cliente original)")
    void shouldUseFirstIpFromForwardedForChain() throws Exception {
        //Substituído anyString() por any(UUID.class) no primeiro parâmetro
        when(roomService.joinRoom(any(UUID.class), anyString(), anyString())).thenReturn(ok());

        mockMvc.perform(post("/api/v1/rooms/join/A1B2C3").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .header("X-Forwarded-For", "203.0.113.5, 10.0.0.1"))
                .andExpect(status().isOk());

        verify(roomService).joinRoom(USER, "A1B2C3", "203.0.113.5");
    }

    @Test
    @DisplayName("Sem X-Forwarded-For: usa o IP de origem da conexão")
    void shouldFallbackToRemoteAddr() throws Exception {
        when(roomService.joinRoom(any(UUID.class), anyString(), anyString())).thenReturn(ok());

        mockMvc.perform(post("/api/v1/rooms/join/A1B2C3")
                        .with(jwt().jwt(j -> j.subject(USER.toString())))
                        .with(r -> { r.setRemoteAddr("198.51.100.9"); return r; }))
                .andExpect(status().isOk());

        verify(roomService).joinRoom(USER, "A1B2C3", "198.51.100.9");
    }

    // ───────── INVÁLIDOS ─────────

    @Test
    void shouldReturnNotFoundWhenCodeIsInvalid() throws Exception {
        when(roomService.joinRoom(any(UUID.class), eq("WRONG1"), anyString()))
                .thenThrow(new InvalidAccessCodeException("Invalid access code."));

        mockMvc.perform(post("/api/v1/rooms/join").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"WRONG1\"}")
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Invalid access code."));
    }

    @Test
    void shouldReturnNotFoundWhenInviteLinkHasInvalidCode() throws Exception {
        when(roomService.joinRoom(any(UUID.class), eq("WRONG1"), anyString()))
                .thenThrow(new InvalidAccessCodeException("Invalid access code."));

        mockMvc.perform(post("/api/v1/rooms/join/WRONG1").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnTooManyRequestsWhenIpIsBlocked() throws Exception {
        when(roomService.joinRoom(any(UUID.class), anyString(), eq(IP)))
                .thenThrow(new TooManyAttemptsException("Too many failed attempts. Please try again later."));

        mockMvc.perform(post("/api/v1/rooms/join").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"A1B2C3\"}")
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many failed attempts. Please try again later."));
    }

    @Test
    void shouldReturnTooManyRequestsOnInviteLinkWhenIpIsBlocked() throws Exception {
        when(roomService.joinRoom(any(UUID.class), anyString(), eq(IP)))
                .thenThrow(new TooManyAttemptsException("Too many failed attempts. Please try again later."));

        mockMvc.perform(post("/api/v1/rooms/join/A1B2C3").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("accessCode vazio -> 400 e o Service não é acionado")
    void shouldReturnBadRequestWhenCodeIsBlank() throws Exception {
        mockMvc.perform(post("/api/v1/rooms/join").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"\"}"))
                .andExpect(status().isBadRequest());

        verify(roomService, never()).joinRoom(any(UUID.class), anyString(), anyString());
    }

    @Test
    @DisplayName("Sem usuário autenticado -> 401 e o Service não é acionado")
    void shouldRejectUnauthenticatedRequest() throws Exception {
        mockMvc.perform(post("/api/v1/rooms/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"A1B2C3\"}"))
                .andExpect(status().isUnauthorized());

        verify(roomService, never()).joinRoom(any(UUID.class), anyString(), anyString());
    }

    @Test
    @DisplayName("Segurança: userId enviado no corpo é ignorado; vale o usuário autenticado (JWT)")
    void shouldIgnoreUserIdSentByClient() throws Exception {
        when(roomService.joinRoom(any(UUID.class), anyString(), anyString())).thenReturn(ok());

        // CORREÇÃO 5: UUID válido em vez da string estática "another-user"
        UUID fakeClientUser = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/rooms/join").with(jwt().jwt(j -> j.subject(USER.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"A1B2C3\", \"userId\": \"" + fakeClientUser + "\"}"))
                .andExpect(status().isOk());

        verify(roomService).joinRoom(eq(USER), eq("A1B2C3"), anyString());
        verify(roomService, never()).joinRoom(eq(fakeClientUser), anyString(), anyString());
    }
}