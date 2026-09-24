package com.uefs.tfs.avaliasystem.US02;

import tools.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.controller.AuthController;
import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.service.UsuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.uefs.tfs.avaliasystem.AvaliaSystemApplication;
import org.springframework.test.context.ContextConfiguration;

/**
 * US02 — Autenticação e Dashboard de Salas.
 *
 * Testa os critérios de aceite relacionados ao login via /api/auth/login:
 *   • VÁLIDOS : login correto gera token JWT com campo de expiração preenchido.
 *   • INVÁLIDOS: senha/e-mail errado retorna 401 com mensagem genérica
 *               "Credenciais inválidas" (sem vazar se o e-mail existe ou não).
 *               Token expirado (simulado no header) retorna 401.
 */
@WebMvcTest(AuthController.class)
@ContextConfiguration(classes = AvaliaSystemApplication.class)
class AuthLoginControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UsuarioService usuarioService;

    // ────────────────────────────────────────────────────────────────────────
    //  TESTES VÁLIDOS
    // ────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Testes Válidos — Login e Token JWT")
    class TestesValidos {

        @Test
        @DisplayName("US02-V1 — login com credenciais corretas retorna 200 e token JWT")
        void deveRetornarTokenJwtAoLogarComCredenciaisCorretas() throws Exception {
            var loginRequest = new LoginRequest("ana@uefs.br", "senhaForte123");

            // Token simulado com expiração em 24h a partir de agora
            Instant expiresAt = Instant.now().plus(24, ChronoUnit.HOURS);
            var response = new LoginResponse(
                    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbmFAdWVmcy5iciIsImV4cCI6OTk5OTk5OTk5OX0.assinatura",
                    expiresAt.toEpochMilli()
            );

            when(usuarioService.login(anyString(), anyString())).thenReturn(response);

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").exists())
                    .andExpect(jsonPath("$.token").isNotEmpty())
                    .andExpect(jsonPath("$.expiresAt").exists());
        }

        @Test
        @DisplayName("US02-V2 — token gerado possui prazo de validade de até 24h no futuro")
        void tokenDeveConterPrazoDeValidadeEm24Horas() throws Exception {
            var loginRequest = new LoginRequest("ana@uefs.br", "senhaForte123");

            long agora = Instant.now().toEpochMilli();
            long em24h = Instant.now().plus(24, ChronoUnit.HOURS).toEpochMilli();

            var response = new LoginResponse(
                    "eyJhbGciOiJIUzI1NiJ9.payload.signature",
                    em24h
            );

            when(usuarioService.login(anyString(), anyString())).thenReturn(response);

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    // expiresAt deve ser maior que o instante atual (token válido)
                    .andExpect(jsonPath("$.expiresAt").value(greaterThan(agora)))
                    // expiresAt deve ser no máximo 24h + uma margem de 5 s a partir de agora
                    .andExpect(jsonPath("$.expiresAt").value(lessThanOrEqualTo(
                            Instant.now().plus(24, ChronoUnit.HOURS).plusSeconds(5).toEpochMilli()
                    )));
        }

        @Test
        @DisplayName("US02-V3 — resposta de login não expõe senha do usuário")
        void respostaDeLoginNaoDeveExporSenha() throws Exception {
            var loginRequest = new LoginRequest("ana@uefs.br", "senhaForte123");

            var response = new LoginResponse(
                    "eyJhbGciOiJIUzI1NiJ9.payload.signature",
                    Instant.now().plus(24, ChronoUnit.HOURS).toEpochMilli()
            );

            when(usuarioService.login(anyString(), anyString())).thenReturn(response);

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.senha").doesNotExist())
                    .andExpect(jsonPath("$.password").doesNotExist());
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  TESTES INVÁLIDOS
    // ────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Testes Inválidos — Falhas de Autenticação")
    class TestesInvalidos {

        @Test
        @DisplayName("US02-I1 — senha incorreta retorna 401 com mensagem genérica")
        void devRetornar401ComMensagemGenericaParaSenhaIncorreta() throws Exception {
            var loginRequest = new LoginRequest("ana@uefs.br", "senhaErrada");

            when(usuarioService.login("ana@uefs.br", "senhaErrada"))
                    .thenThrow(new com.uefs.tfs.avaliasystem.exception.CredenciaisInvalidasException("Credenciais inválidas"));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isUnauthorized())
                    // deve conter a mensagem genérica
                    .andExpect(jsonPath("$.message").value("Credenciais inválidas"))
                    // não deve vazar se o e-mail existe ou não
                    .andExpect(content().string(not(containsString("e-mail não encontrado"))))
                    .andExpect(content().string(not(containsString("usuário não existe"))))
                    .andExpect(content().string(not(containsString("email not found"))))
                    .andExpect(content().string(not(containsString("user not found"))));
        }

        @Test
        @DisplayName("US02-I2 — e-mail inexistente retorna 401 com a mesma mensagem genérica (não revela ausência do e-mail)")
        void devRetornar401ComMensagemGenericaParaEmailInexistente() throws Exception {
            var loginRequest = new LoginRequest("naoexiste@uefs.br", "qualquerSenha");

            when(usuarioService.login("naoexiste@uefs.br", "qualquerSenha"))
                    .thenThrow(new com.uefs.tfs.avaliasystem.exception.CredenciaisInvalidasException("Credenciais inválidas"));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Credenciais inválidas"))
                    // mensagem deve ser idêntica à de senha incorreta — não revela qual campo falhou
                    .andExpect(content().string(not(containsString("e-mail"))))
                    .andExpect(content().string(not(containsString("email not found"))))
                    .andExpect(content().string(not(containsString("conta inexistente"))));
        }

        @Test
        @DisplayName("US02-I3 — requisição com token JWT expirado retorna 401 (Unauthorized)")
        void devRetornar401ParaTokenJwtExpirado() throws Exception {
            // Token expirado: mesmo formato JWT, mas com exp no passado (simulado via header)
            String tokenExpirado = "Bearer eyJhbGciOiJIUzI1NiJ9" +
                    ".eyJzdWIiOiJhbmFAdWVmcy5iciIsImV4cCI6MX0" +
                    ".assinatura_invalida";

            mockMvc.perform(get("/api/dashboard")
                            .header("Authorization", tokenExpirado))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("US02-I4 — requisição sem token JWT retorna 401 (Unauthorized)")
        void devRetornar401SemTokenJwt() throws Exception {
            mockMvc.perform(get("/api/dashboard"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("US02-I5 — erro de login não deve expor stack trace ou informações internas")
        void erroDeLoginNaoDeveExporInformacoesInternas() throws Exception {
            var loginRequest = new LoginRequest("ana@uefs.br", "senhaErrada");

            when(usuarioService.login(anyString(), anyString()))
                    .thenThrow(new com.uefs.tfs.avaliasystem.exception.CredenciaisInvalidasException("Credenciais inválidas"));

            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isUnauthorized())
                    // Garante que stack traces e nomes de classes internas não vazam
                    .andExpect(content().string(not(containsString("Exception"))))
                    .andExpect(content().string(not(containsString("at com.uefs"))))
                    .andExpect(content().string(not(containsString("StackTrace"))));
        }
    }
}
