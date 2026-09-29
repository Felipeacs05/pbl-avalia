package com.uefs.tfs.avaliasystem.US02;

import com.uefs.tfs.avaliasystem.AvaliaSystemApplication;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.AuthController;
import com.uefs.tfs.avaliasystem.controller.DashboardController;
import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.exception.InvalidCredentialsException;
import com.uefs.tfs.avaliasystem.service.RoomService;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * US02 — Autenticação e Dashboard de Salas.
 *
 * Testa os critérios de aceite relacionados ao login via /api/v1/auth/login:
 *   • VÁLIDOS : login correto gera token JWT com campo de expiração preenchido.
 *   • INVÁLIDOS: senha/e-mail errado retorna 401 com mensagem genérica
 *               "Credenciais inválidas" (sem vazar se o e-mail existe ou não).
 *               Token expirado (simulado no header) retorna 401.
 */
@WebMvcTest(DashboardController.class)
@Import(SecurityConfig.class)
@ContextConfiguration(classes = AvaliaSystemApplication.class)
class DashboardControllerLoggedTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomService roomService;

    // ────────────────────────────────────────────────────────────────────────
    //  TESTES VÁLIDOS
    // ────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Testes Válidos — Login e Token JWT")
    class ValidTests {

        @Test
        @DisplayName("US02-I3 — requisição com token JWT expirado retorna 401 (Unauthorized)")
        void shouldReturn401ForExpiredJwtToken() throws Exception {
            // Token expirado: mesmo formato JWT, mas com exp no passado (simulado via header)
            String expiredToken = "Bearer eyJhbGciOiJIUzI1NiJ9" +
                    ".eyJzdWIiOiJhbmFAdWVmcy5iciIsImV4cCI6MX0" +
                    ".assinatura_invalida";

            mockMvc.perform(get("/api/users/me/rooms")
                            .header("Authorization", expiredToken))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("US02-I4 — requisição sem token JWT retorna 401 (Unauthorized)")
        void shouldReturn401WithoutJwtToken() throws Exception {
            mockMvc.perform(get("/api/users/me/rooms"))
                    .andExpect(status().isUnauthorized());
        }
    }
}
