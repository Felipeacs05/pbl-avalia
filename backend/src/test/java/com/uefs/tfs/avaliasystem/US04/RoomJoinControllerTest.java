package com.uefs.tfs.avaliasystem.US04;

import com.uefs.tfs.avaliasystem.controller.RoomController;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidAccessCodeException;
import com.uefs.tfs.avaliasystem.exception.TooManyAttemptsException;
import com.uefs.tfs.avaliasystem.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato HTTP da US04.
 *  POST /api/v1/rooms/join          body {"accessCode": "..."}  -> código digitado
 *  POST /api/v1/rooms/join/{code}   -> chamado pelo front na rota SPA app/join/{code}
 * O usuário vem do Principal (nunca do corpo/parâmetro) e o IP de X-Forwarded-For (1º valor),
 * com fallback para o remoteAddr.
 * Os handlers 404/429 devem estar no GlobalExceptionHandler (@WebMvcTest carrega o @RestControllerAdvice).
 */
@WebMvcTest(RoomController.class)
class RoomJoinControllerTest {

    private static final String IP = "192.168.1.1";
    private static final String USER = "555e4567-e89b-12d3-a456-426614174000";

    @Autowired private MockMvc mockMvc;
    @MockitoBean private RoomService roomService;

    private Principal principal;

    @BeforeEach
    void setUp() {
        principal = Mockito.mock(Principal.class);
        when(principal.getName()).thenReturn(USER);
    }

    private RoomResponse ok() {
        return new RoomResponse("room-1", "Math Room", "A1B2C3", "app/join/A1B2C3");
    }

    // ───────── VÁLIDOS ─────────

    @Test
    void shouldReturnOkWhenJoiningViaCorrectCode() throws Exception {
        when(roomService.joinRoom(USER, "A1B2C3", IP)).thenReturn(ok());

        mockMvc.perform(post("/api/v1/rooms/join").principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"A1B2C3\"}")
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("A1B2C3"));
    }

    @Test
    void shouldReturnOkWhenJoiningViaInviteLink() throws Exception {
        when(roomService.joinRoom(USER, "A1B2C3", IP)).thenReturn(ok());

        mockMvc.perform(post("/api/v1/rooms/join/A1B2C3").principal(principal)
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.joinLink").value("app/join/A1B2C3"));
    }

    @Test
    @DisplayName("X-Forwarded-For com vários proxies: usa o primeiro IP (cliente original)")
    void shouldUseFirstIpFromForwardedForChain() throws Exception {
        when(roomService.joinRoom(anyString(), anyString(), anyString())).thenReturn(ok());

        mockMvc.perform(post("/api/v1/rooms/join/A1B2C3").principal(principal)
                        .header("X-Forwarded-For", "203.0.113.5, 10.0.0.1"))
                .andExpect(status().isOk());

        verify(roomService).joinRoom(USER, "A1B2C3", "203.0.113.5");
    }

    @Test
    @DisplayName("Sem X-Forwarded-For: usa o IP de origem da conexão")
    void shouldFallbackToRemoteAddr() throws Exception {
        when(roomService.joinRoom(anyString(), anyString(), anyString())).thenReturn(ok());

        mockMvc.perform(post("/api/v1/rooms/join/A1B2C3").principal(principal)
                        .with(r -> { r.setRemoteAddr("198.51.100.9"); return r; }))
                .andExpect(status().isOk());

        verify(roomService).joinRoom(USER, "A1B2C3", "198.51.100.9");
    }

    // ───────── INVÁLIDOS ─────────

    @Test
    void shouldReturnNotFoundWhenCodeIsInvalid() throws Exception {
        when(roomService.joinRoom(anyString(), eq("WRONG1"), anyString()))
                .thenThrow(new InvalidAccessCodeException("Invalid access code."));

        mockMvc.perform(post("/api/v1/rooms/join").principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"WRONG1\"}")
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Invalid access code."));
    }

    @Test
    void shouldReturnNotFoundWhenInviteLinkHasInvalidCode() throws Exception {
        when(roomService.joinRoom(anyString(), eq("WRONG1"), anyString()))
                .thenThrow(new InvalidAccessCodeException("Invalid access code."));

        mockMvc.perform(post("/api/v1/rooms/join/WRONG1").principal(principal)
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnTooManyRequestsWhenIpIsBlocked() throws Exception {
        when(roomService.joinRoom(anyString(), anyString(), eq(IP)))
                .thenThrow(new TooManyAttemptsException("Too many failed attempts. Please try again later."));

        mockMvc.perform(post("/api/v1/rooms/join").principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"A1B2C3\"}")
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message").value("Too many failed attempts. Please try again later."));
    }

    @Test
    void shouldReturnTooManyRequestsOnInviteLinkWhenIpIsBlocked() throws Exception {
        when(roomService.joinRoom(anyString(), anyString(), eq(IP)))
                .thenThrow(new TooManyAttemptsException("Too many failed attempts. Please try again later."));

        mockMvc.perform(post("/api/v1/rooms/join/A1B2C3").principal(principal)
                        .header("X-Forwarded-For", IP))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("accessCode vazio -> 400 e o Service não é acionado")
    void shouldReturnBadRequestWhenCodeIsBlank() throws Exception {
        mockMvc.perform(post("/api/v1/rooms/join").principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"\"}"))
                .andExpect(status().isBadRequest());

        verify(roomService, never()).joinRoom(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Sem usuário autenticado -> 403 e o Service não é acionado")
    void shouldRejectUnauthenticatedRequest() throws Exception {
        mockMvc.perform(post("/api/v1/rooms/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"A1B2C3\"}"))
                .andExpect(status().isForbidden());

        verify(roomService, never()).joinRoom(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Segurança: userId enviado no corpo é ignorado; vale o usuário autenticado (Principal)")
    void shouldIgnoreUserIdSentByClient() throws Exception {
        when(roomService.joinRoom(anyString(), anyString(), anyString())).thenReturn(ok());

        mockMvc.perform(post("/api/v1/rooms/join").principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\": \"A1B2C3\", \"userId\": \"another-user\"}"))
                .andExpect(status().isOk());

        verify(roomService).joinRoom(eq(USER), eq("A1B2C3"), anyString());
        verify(roomService, never()).joinRoom(eq("another-user"), anyString(), anyString());
    }
}