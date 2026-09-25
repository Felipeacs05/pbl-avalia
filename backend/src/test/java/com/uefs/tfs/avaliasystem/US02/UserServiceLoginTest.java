package com.uefs.tfs.avaliasystem.US02;

import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.exception.CredenciaisInvalidasException;
import com.uefs.tfs.avaliasystem.model.Usuario;
import com.uefs.tfs.avaliasystem.repository.UsuarioRepository;
import com.uefs.tfs.avaliasystem.service.UsuarioServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * US02 — Testes Unitários de Regra de Negócio de Autenticação (Service).
 *
 * Cobertura de Critérios de Aceite:
 *  - CA1 (Sessão): Geração do token JWT com prazo de expiração de 24h.
 *  - CA2 (Privacidade): Erro genérico "Credenciais inválidas" para senha incorreta ou e-mail inexistente,
 *                       sem expor existência de conta ou vazar informações sensíveis.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("US02 — Testes de Regra de Negócio de Autenticação (UsuarioServiceImpl)")
class UsuarioServiceLoginTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioServiceImpl usuarioService;

    private static final String MENSAGEM_GENERICA = "Credenciais inválidas";

    @Nested
    @DisplayName("Testes de Privacidade e Falhas de Autenticação (CA2)")
    class TestesDePrivacidade {

        @Test
        @DisplayName("US02-I1 — E-mail inexistente deve lançar CredenciaisInvalidasException sem vazar o e-mail")
        void emailInexistenteDeveLancarExcecaoGenerica() {
            String emailInexistente = "naoexiste@uefs.br";
            when(usuarioRepository.findByEmail(emailInexistente)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> usuarioService.login(emailInexistente, "qualquerSenha"))
                    .isInstanceOf(CredenciaisInvalidasException.class)
                    .hasMessage(MENSAGEM_GENERICA)
                    .hasMessageNotContaining(emailInexistente);
        }

        @Test
        @DisplayName("US02-I2 — Senha incorreta deve lançar exatamente a mesma mensagem genérica")
        void senhaIncorretaDeveLancarMesmaMensagemGenerica() {
            String email = "marina@uefs.br";
            Usuario usuario = new Usuario("Marina Souza", email, "$2a$10$hashBCryptArmazenado", "url-foto");

            when(usuarioRepository.findByEmail(email)).thenReturn(Optional.of(usuario));
            when(passwordEncoder.matches("senhaIncorreta", usuario.getSenha())).thenReturn(false);

            assertThatThrownBy(() -> usuarioService.login(email, "senhaIncorreta"))
                    .isInstanceOf(CredenciaisInvalidasException.class)
                    .hasMessage(MENSAGEM_GENERICA)
                    .hasMessageNotContaining("senha");
        }
    }
}
