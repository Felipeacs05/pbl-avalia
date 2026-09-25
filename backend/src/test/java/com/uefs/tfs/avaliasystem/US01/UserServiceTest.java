package com.uefs.tfs.avaliasystem.US01;

import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * US01 — Cadastro de Usuário com Foto de Perfil (Camada Service).
 * Cobertura de Critérios de Aceite:
 *  - CA1 (Criptografia): Criptografia prévia da senha com PasswordEncoder (BCrypt).
 *  - CA3 (Desempenho/Regras): Rejeição de fotos > 5MB e formatos que não sejam JPG/PNG.
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository, passwordEncoder);
    }

    @Test
    @DisplayName("US01 - senha deve ser criptografada via BCrypt antes de salvar no banco")
    void shouldEncryptPasswordBeforeSaving() {
        var request = new RegisterUserRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var profilePicture = new MockMultipartFile("photo", "perfil.jpg", "image/jpeg", "conteudo-fake".getBytes());

        when(passwordEncoder.encode("senhaForte123")).thenReturn("$2a$10$hashSimuladoDeExemplo");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User savedUser = userService.register(request, profilePicture);

        assertThat(savedUser.getPassword())
                .as("A senha persistida nunca pode ser o texto plano enviado")
                .isNotEqualTo("senhaForte123")
                .isEqualTo("$2a$10$hashSimuladoDeExemplo");

        verify(passwordEncoder).encode("senhaForte123");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("US01 - foto de perfil maior que 5MB deve ser rejeitada")
    void shouldRejectPhotoAboveSizeLimit() {
        var request = new RegisterUserRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        byte[] contentAbove5MB = new byte[6 * 1024 * 1024]; // 6 MB
        var largePhoto = new MockMultipartFile("photo", "perfil.jpg", "image/jpeg", contentAbove5MB);

        assertThatThrownBy(() -> userService.register(request, largePhoto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5MB");
    }

    @ParameterizedTest
    @ValueSource(strings = {"application/pdf", "image/gif", "application/octet-stream", "text/plain"})
    @DisplayName("US01 - formatos de arquivo diferentes de JPG ou PNG devem ser rejeitados")
    void shouldRejectPhotoWithInvalidFormats(String invalidContentType) {
        var request = new RegisterUserRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var invalidPhoto = new MockMultipartFile("photo", "arquivo.bin", invalidContentType, "conteudo".getBytes());

        assertThatThrownBy(() -> userService.register(request, invalidPhoto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("JPG ou PNG");
    }

    @ParameterizedTest
    @ValueSource(strings = {"image/jpeg", "image/jpg", "image/png"})
    @DisplayName("US01 - formatos válidos (JPG, JPEG, PNG) devem ser aceitos com sucesso")
    void shouldAcceptValidFormats(String validContentType) {
        var request = new RegisterUserRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var validPhoto = new MockMultipartFile("photo", "foto.img", validContentType, "conteudo-ok".getBytes());

        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User savedUser = userService.register(request, validPhoto);

        assertThat(savedUser).isNotNull();
        assertThat(savedUser.getName()).isEqualTo("Ana Silva");
    }
}