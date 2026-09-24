package com.uefs.tfs.avaliasystem.US01;

import com.uefs.tfs.avaliasystem.dto.CadastroUsuarioRequest;
import com.uefs.tfs.avaliasystem.model.Usuario;
import com.uefs.tfs.avaliasystem.repository.UsuarioRepository;
import com.uefs.tfs.avaliasystem.service.UsuarioServiceImpl;
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
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UsuarioServiceImpl usuarioService;

    @BeforeEach
    void setUp() {
        usuarioService = new UsuarioServiceImpl(usuarioRepository, passwordEncoder);
    }

    @Test
    @DisplayName("US01 - senha deve ser criptografada via BCrypt antes de salvar no banco")
    void deveCriptografarSenhaAntesDeSalvar() {
        var request = new CadastroUsuarioRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var foto = new MockMultipartFile("foto", "perfil.jpg", "image/jpeg", "conteudo-fake".getBytes());

        when(passwordEncoder.encode("senhaForte123")).thenReturn("$2a$10$hashSimuladoDeExemplo");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Usuario usuarioSalvo = usuarioService.cadastrar(request, foto);

        assertThat(usuarioSalvo.getSenha())
                .as("A senha persistida nunca pode ser o texto plano enviado")
                .isNotEqualTo("senhaForte123")
                .isEqualTo("$2a$10$hashSimuladoDeExemplo");

        verify(passwordEncoder).encode("senhaForte123");
        verify(usuarioRepository).save(any(Usuario.class));
    }

    @Test
    @DisplayName("US01 - foto de perfil maior que 5MB deve ser rejeitada")
    void deveRejeitarFotoAcimaDoLimite() {
        var request = new CadastroUsuarioRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        byte[] conteudoAcimaDe5MB = new byte[6 * 1024 * 1024]; // 6 MB
        var fotoGrande = new MockMultipartFile("foto", "perfil.jpg", "image/jpeg", conteudoAcimaDe5MB);

        assertThatThrownBy(() -> usuarioService.cadastrar(request, fotoGrande))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("5MB");
    }

    @ParameterizedTest
    @ValueSource(strings = {"application/pdf", "image/gif", "application/octet-stream", "text/plain"})
    @DisplayName("US01 - formatos de arquivo diferentes de JPG ou PNG devem ser rejeitados")
    void deveRejeitarFotoComFormatosInvalidos(String contentTypeInvalido) {
        var request = new CadastroUsuarioRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var fotoInvalida = new MockMultipartFile("foto", "arquivo.bin", contentTypeInvalido, "conteudo".getBytes());

        assertThatThrownBy(() -> usuarioService.cadastrar(request, fotoInvalida))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("JPG ou PNG");
    }

    @ParameterizedTest
    @ValueSource(strings = {"image/jpeg", "image/jpg", "image/png"})
    @DisplayName("US01 - formatos válidos (JPG, JPEG, PNG) devem ser aceitos com sucesso")
    void deveAceitarFormatosValidos(String contentTypeValido) {
        var request = new CadastroUsuarioRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var fotoValida = new MockMultipartFile("foto", "foto.img", contentTypeValido, "conteudo-ok".getBytes());

        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        Usuario usuarioSalvo = usuarioService.cadastrar(request, fotoValida);

        assertThat(usuarioSalvo).isNotNull();
        assertThat(usuarioSalvo.getNome()).isEqualTo("Ana Silva");
    }
}