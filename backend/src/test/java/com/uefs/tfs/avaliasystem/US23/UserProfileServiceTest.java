package com.uefs.tfs.avaliasystem.US23;

import com.uefs.tfs.avaliasystem.dto.ChangePasswordRequest;
import com.uefs.tfs.avaliasystem.dto.UpdateProfileRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.UserProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Contrato assumido:
 * - Serviço: UserProfileService
 *   - updateProfile(UUID userId, UpdateProfileRequest request, MultipartFile photo):
 *     Atualiza o nome e, se fornecida foto válida (JPG, JPEG, PNG de até 5MB), armazena o arquivo no storage
 *     e remove a foto antiga do disco. Se o arquivo for inválido, lança IllegalArgumentException sem alterar o banco (atomicidade).
 *   - changePassword(UUID userId, ChangePasswordRequest request):
 *     Valida a senha atual via PasswordEncoder.matches; se inválida, lança IllegalArgumentException("Senha atual incorreta.");
 *     se nova senha for idêntica à atual, lança IllegalArgumentException;
 *     se válida, codifica a nova senha via BCrypt, incrementa tokenVersion (revogando sessões antigas) e salva o usuário.
 * - Armazenamento de fotos: app.storage.upload-dir (injetado via @TempDir para isolamento).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("[US23] Testes Unitários de UserProfileService")
class UserProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @TempDir
    Path tempUploadDir;

    private UserProfileService userProfileService;
    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = new User();
        testUser.setId(userId);
        testUser.setName("Nome Antigo");
        testUser.setEmail("usuario.perfil@uefs.br");
        testUser.setPassword("senhaAtualCriptografada");
        testUser.setTokenVersion(1);
        testUser.setProfilePictureUrl(null);

        // Inicializa o serviço utilizando o diretório temporário para testes de upload
        userProfileService = new UserProfileService(userRepository, passwordEncoder, tempUploadDir.toString());
    }

    @Nested
    @DisplayName("[US23] Atualização de Nome e Dados Básicos")
    class UpdateNameScenarios {

        @Test
        @DisplayName("[US23] Deve atualizar o nome do usuário com sucesso e retornar o DTO UserResponse atualizado")
        void updateProfile_ValidName_UpdatesAndReturnsUserResponse() {
            // Arrange (Dado um usuário existente e uma solicitação de novo nome sem foto)
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

            UpdateProfileRequest request = new UpdateProfileRequest("Nome Atualizado Silva");

            // Act (Quando a atualização é acionada)
            UserResponse response = userProfileService.updateProfile(userId, request, null);

            // Assert (O nome salvo e retornado deve ser o novo)
            assertNotNull(response);
            assertEquals("Nome Atualizado Silva", response.getName());
            assertEquals("Nome Atualizado Silva", testUser.getName());
            verify(userRepository, times(1)).save(testUser);
        }

        @Test
        @DisplayName("[US23] Deve rejeitar nome contendo caracteres proibidos '<' ou '>' para proteção contra XSS")
        void updateProfile_NameWithInvalidCharacters_ThrowsIllegalArgumentException() {
            // Arrange
            UpdateProfileRequest maliciousRequest = new UpdateProfileRequest("Nome <script>alert(1)</script>");

            // Act & Assert (O serviço deve rejeitar antes de qualquer persistência)
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> userProfileService.updateProfile(userId, maliciousRequest, null)
            );

            assertThat(ex.getMessage()).containsIgnoringCase("caracteres inválidos");
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("[US23] Atualização de Foto de Perfil")
    class UpdatePhotoScenarios {

        @Test
        @DisplayName("[US23] Deve salvar foto válida (PNG/JPG) com bytes idênticos no disco e gerar URL correta")
        void updateProfile_ValidPhoto_SavesFileWithIdenticalBytesAndGeneratesCorrectUrl() throws IOException {
            // Arrange (Dado um arquivo de imagem válido de 100 KB)
            byte[] photoBytes = "fake-png-binary-content-12345678".getBytes();
            MockMultipartFile validPhoto = new MockMultipartFile(
                    "photo",
                    "nova_foto.png",
                    "image/png",
                    photoBytes
            );

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

            UpdateProfileRequest request = new UpdateProfileRequest("Nome Com Foto");

            // Act (Quando o perfil é atualizado com a foto)
            UserResponse response = userProfileService.updateProfile(userId, request, validPhoto);

            // Assert (URL deve ser gerada com extensão .png e os bytes salvos no disco devem ser idênticos)
            assertNotNull(response.getProfilePictureUrl(), "A URL da foto deve ser preenchida");
            assertTrue(response.getProfilePictureUrl().contains("/fotosPerfil/"), "A URL deve conter a rota pública /fotosPerfil/");
            assertTrue(response.getProfilePictureUrl().endsWith(".png"), "A extensão do arquivo salvo deve corresponder ao tipo .png");

            String savedFilename = response.getProfilePictureUrl().substring(response.getProfilePictureUrl().lastIndexOf("/") + 1);
            Path savedFilePath = tempUploadDir.resolve(savedFilename);
            assertTrue(Files.exists(savedFilePath), "O arquivo deve existir fisicamente na pasta de uploads");
            assertArrayEquals(photoBytes, Files.readAllBytes(savedFilePath), "Os bytes no disco devem ser rigorosamente idênticos");
        }

        @Test
        @DisplayName("[US23] Deve remover do disco a foto antiga do usuário ao atualizar para uma nova foto")
        void updateProfile_WithExistingPhoto_DeletesOldPhotoFromDisk() throws IOException {
            // Arrange (Dado que o usuário já possuía uma foto anterior salva no disco)
            String oldFilename = "foto_antiga_" + UUID.randomUUID() + ".jpg";
            Path oldFilePath = tempUploadDir.resolve(oldFilename);
            Files.write(oldFilePath, "conteudo-antigo".getBytes());
            testUser.setProfilePictureUrl("/fotosPerfil/" + oldFilename);

            MockMultipartFile newPhoto = new MockMultipartFile(
                    "photo",
                    "nova_foto.jpg",
                    "image/jpeg",
                    "conteudo-novo".getBytes()
            );

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

            // Act (Quando atualiza com a nova foto)
            userProfileService.updateProfile(userId, new UpdateProfileRequest("Nome"), newPhoto);

            // Assert (A foto anterior deve ter sido deletada do disco para evitar acúmulo de arquivos órfãos)
            assertFalse(Files.exists(oldFilePath), "A foto anterior deve ser apagada do storage após a troca");
        }

        @Test
        @DisplayName("[US23] Fronteira: arquivo com exatamente 5MB deve ser aceito com sucesso")
        void updateProfile_PhotoExact5MB_IsAcceptedAndSaved() {
            // Arrange (5MB exatos = 5 * 1024 * 1024 bytes)
            byte[] exact5Mb = new byte[5 * 1024 * 1024];
            MockMultipartFile photo5Mb = new MockMultipartFile(
                    "photo",
                    "limite_5mb.jpg",
                    "image/jpeg",
                    exact5Mb
            );

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

            // Act & Assert (Deve processar sem lançar exceção)
            assertDoesNotThrow(() -> userProfileService.updateProfile(userId, new UpdateProfileRequest("Nome 5MB"), photo5Mb));
            verify(userRepository).save(testUser);
        }

        @Test
        @DisplayName("[US23] Fronteira: arquivo com 5MB + 1 byte deve ser rejeitado com mensagem contendo '5MB'")
        void updateProfile_PhotoExceeds5MB_ThrowsIllegalArgumentException() {
            // Arrange (5MB + 1 byte)
            byte[] over5Mb = new byte[5 * 1024 * 1024 + 1];
            MockMultipartFile oversizedPhoto = new MockMultipartFile(
                    "photo",
                    "excesso.jpg",
                    "image/jpeg",
                    over5Mb
            );

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            // Act & Assert (Deve abortar com mensagem padrão de 5MB)
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> userProfileService.updateProfile(userId, new UpdateProfileRequest("Nome"), oversizedPhoto)
            );

            assertThat(ex.getMessage()).containsIgnoringCase("5MB");
            verify(userRepository, never()).save(any());
        }

        @ParameterizedTest(name = "[{index}] Content-Type proibido: {0}")
        @ValueSource(strings = {"image/gif", "application/pdf", "text/plain", "application/octet-stream"})
        @DisplayName("[US23] Deve rejeitar formatos de arquivo que não sejam JPG, JPEG ou PNG")
        void updateProfile_DisallowedContentTypes_ThrowsIllegalArgumentException(String disallowedContentType) {
            // Arrange
            MockMultipartFile invalidPhoto = new MockMultipartFile(
                    "photo",
                    "documento",
                    disallowedContentType,
                    "dummy-bytes".getBytes()
            );

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            // Act & Assert
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> userProfileService.updateProfile(userId, new UpdateProfileRequest("Nome"), invalidPhoto)
            );

            assertThat(ex.getMessage()).containsIgnoringCase("JPG, PNG ou JPEG");
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US23] Deve rejeitar tentativa de spoofing (extensão .jpg com Content-Type application/pdf)")
        void updateProfile_PhotoExtensionAndContentTypeSpoof_ThrowsIllegalArgumentException() {
            // Arrange (Arquivo nomeado com .jpg mas cabeçalho real PDF)
            MockMultipartFile spoofedFile = new MockMultipartFile(
                    "photo",
                    "virus.jpg",
                    "application/pdf",
                    "%PDF-1.5 fake".getBytes()
            );

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            // Act & Assert (O Content-Type deve prevalecer e ser bloqueado)
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> userProfileService.updateProfile(userId, new UpdateProfileRequest("Nome"), spoofedFile)
            );

            assertThat(ex.getMessage()).containsIgnoringCase("JPG, PNG ou JPEG");
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US23] Arquivo de foto vazio (0 bytes) deve ser tratado como ausência de foto, preservando a foto atual")
        void updateProfile_EmptyPhotoFile_TreatedAsNoPhotoAndKeepsCurrentPhoto() {
            // Arrange (Arquivo vazio fornecido pelo formulário)
            testUser.setProfilePictureUrl("/fotosPerfil/foto_existente.jpg");
            MockMultipartFile emptyFile = new MockMultipartFile(
                    "photo",
                    "",
                    "image/jpeg",
                    new byte[0]
            );

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

            // Act
            UserResponse response = userProfileService.updateProfile(userId, new UpdateProfileRequest("Nome Atualizado"), emptyFile);

            // Assert (Foto atual deve ser mantida)
            assertEquals("/fotosPerfil/foto_existente.jpg", response.getProfilePictureUrl(),
                    "Arquivo vazio não deve sobrescrever nem remover a foto atual");
        }

        @Test
        @DisplayName("[US23] Atomicidade: erro na validação da foto NÃO deve atualizar o nome no banco")
        void updateProfile_InvalidPhoto_RollsBackAndDoesNotUpdateNameNorPhoto() {
            // Arrange (Nome novo porém foto inválida)
            MockMultipartFile badPhoto = new MockMultipartFile(
                    "photo",
                    "invalido.gif",
                    "image/gif",
                    "dados".getBytes()
            );
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            // Act & Assert
            assertThrows(
                    IllegalArgumentException.class,
                    () -> userProfileService.updateProfile(userId, new UpdateProfileRequest("Nome Que Nao Deve Salvar"), badPhoto)
            );

            // Confere que o nome do usuário em memória e no banco não foi persistido
            assertEquals("Nome Antigo", testUser.getName(), "O nome do usuário não pode ser alterado se a foto falhar");
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("[US23] Alteração de Senha (changePassword)")
    class ChangePasswordScenarios {

        @Test
        @DisplayName("[US23] Deve alterar a senha com sucesso, codificar em BCrypt e incrementar tokenVersion")
        void changePassword_CorrectCurrentPassword_EncodesNewPasswordAndIncrementsTokenVersion() {
            // Arrange (Dado que a senha atual bate com o hash)
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("senhaAtual123", "senhaAtualCriptografada")).thenReturn(true);
            when(passwordEncoder.matches("novaSenhaForte456", "senhaAtualCriptografada")).thenReturn(false);
            when(passwordEncoder.encode("novaSenhaForte456")).thenReturn("novoHashBcrypt");

            ChangePasswordRequest request = new ChangePasswordRequest("senhaAtual123", "novaSenhaForte456");

            // Act (Quando a alteração de senha é executada)
            userProfileService.changePassword(userId, request);

            // Assert (A senha é alterada, tokenVersion incrementado para invalidar sessões anteriores e salvo)
            assertEquals("novoHashBcrypt", testUser.getPassword());
            assertEquals(2, testUser.getTokenVersion(), "tokenVersion deve ser incrementado de 1 para revogar tokens JWT emitidos anteriormente");
            verify(userRepository, times(1)).save(testUser);
        }

        @Test
        @DisplayName("[US23] Deve lançar IllegalArgumentException('Senha atual incorreta.') quando a senha atual informada for inválida")
        void changePassword_IncorrectCurrentPassword_ThrowsIllegalArgumentExceptionAndDoesNotSave() {
            // Arrange (Senha atual errada informada)
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("senhaErrada", "senhaAtualCriptografada")).thenReturn(false);

            ChangePasswordRequest request = new ChangePasswordRequest("senhaErrada", "novaSenha123");

            // Act & Assert
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> userProfileService.changePassword(userId, request)
            );

            assertEquals("Senha atual incorreta.", ex.getMessage(),
                    "Deve retornar mensagem exata informando incorreção da senha atual");
            verify(passwordEncoder, never()).encode(any());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US23] Deve lançar IllegalArgumentException quando a nova senha for idêntica à senha atual")
        void changePassword_NewPasswordSameAsCurrent_ThrowsIllegalArgumentExceptionAndDoesNotSave() {
            // Arrange (Nova senha igual à senha atual)
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("senhaAtual123", "senhaAtualCriptografada")).thenReturn(true);
            when(passwordEncoder.matches("senhaAtual123", "senhaAtualCriptografada")).thenReturn(true);

            ChangePasswordRequest request = new ChangePasswordRequest("senhaAtual123", "senhaAtual123");

            // Act & Assert
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> userProfileService.changePassword(userId, request)
            );

            assertThat(ex.getMessage()).containsIgnoringCase("diferente da senha atual");
            verify(passwordEncoder, never()).encode(any());
            verify(userRepository, never()).save(any());
        }
    }
}
