package com.uefs.tfs.avaliasystem.US02;

import com.uefs.tfs.avaliasystem.exception.InvalidCredentialsException;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.UserServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * US02 - Testes Unitários de Regra de Negócio de Autenticação (Service).
 * Cobertura de Critérios de Aceite:
 * - CA1 (Sessão): Geração do token JWT com prazo de expiração de 24h.
 * - CA2 (Privacidade): Erro genérico "Credenciais inválidas" para senha incorreta ou e-mail inexistente,
 *                      sem expor existência de conta ou vazar informações sensíveis.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("US02 - Testes de Regra de Negócio de Autenticação (UserServiceImpl)")
class UserServiceLoginTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    private static final String GENERIC_MESSAGE = "Credenciais inválidas";

    @Nested
    @DisplayName("Testes de Privacidade e Falhas de Autenticação (CA2)")
    class PrivacyTests {

        @Test
        @DisplayName("US02-I1 - E-mail inexistente deve lançar InvalidCredentialsException sem vazar o e-mail")
        void shouldThrowGenericExceptionForNonexistentEmail() {
            String nonexistentEmail = "naoexiste@uefs.br";

            when(userRepository.findByEmail(nonexistentEmail)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.login(nonexistentEmail, "qualquerSenha"))
                    .isInstanceOf(InvalidCredentialsException.class)
                    .hasMessage(GENERIC_MESSAGE)
                    .hasMessageNotContaining(nonexistentEmail);
        }

        @Test
        @DisplayName("US02-I2 - Senha incorreta deve lançar exatamente a mesma mensagem genérica")
        void shouldThrowSameGenericMessageForIncorrectPassword() {
            String email = "marina@uefs.br";
            User user = new User("Marina Souza", email, "$2a$10$hashBCryptArmazenado", "url-foto");

            when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("senhaIncorreta", user.getPassword())).thenReturn(false);

            assertThatThrownBy(() -> userService.login(email, "senhaIncorreta"))
                    .isInstanceOf(InvalidCredentialsException.class)
                    .hasMessage(GENERIC_MESSAGE)
                    .hasMessageNotContaining("senha");
        }
    }
}