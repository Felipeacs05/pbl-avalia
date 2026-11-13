package com.uefs.tfs.avaliasystem.US23;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.ChangePasswordRequest;
import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.JwtService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato assumido:
 * - Nível: INTEGRAÇÃO REAL COM BANCO H2 EM MEMÓRIA
 * - Sobe contexto completo: Controller, Service, JPA Repository, SecurityFilterChain com MockMvc.
 * - Testes de ciclo completo:
 *   - Edição de nome e foto real -> releitura via JPA após flush/clear e verificação física do arquivo no disco (@TempDir).
 *   - Troca de senha -> login antigo passa a falhar com 401 "Credenciais inválidas", login com nova senha retorna 200.
 *   - Revogação de sessão: tokens JWT emitidos ANTES da troca de senha têm tokenVersion defasado e passam a ser rejeitados com 401 nas rotas protegidas.
 *   - Senha atual errada -> 400 Bad Request e o hash gravado no banco não sofre alteração.
 *   - Isolamento de usuários: o usuário A não pode alterar os dados do usuário B.
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("[US23] Testes de Integração Real (H2 / MockMvc / Armazenamento)")
class UserProfileIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @PersistenceContext
    private EntityManager entityManager;

    @TempDir
    static Path tempUploadDir;

    @DynamicPropertySource
    static void configureUploadDir(DynamicPropertyRegistry registry) {
        registry.add("app.storage.upload-dir", () -> tempUploadDir.toAbsolutePath().toString());
    }

    private User primaryUser;
    private User secondaryUser;
    private static final String INITIAL_PASSWORD = "SenhaForteOriginal@123";

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        primaryUser = new User();
        primaryUser.setName("Aluno Primário");
        primaryUser.setEmail("aluno.primario." + UUID.randomUUID() + "@uefs.br");
        primaryUser.setPassword(passwordEncoder.encode(INITIAL_PASSWORD));
        primaryUser.setTokenVersion(1);
        primaryUser = userRepository.save(primaryUser);

        secondaryUser = new User();
        secondaryUser.setName("Aluno Secundário");
        secondaryUser.setEmail("aluno.secundario." + UUID.randomUUID() + "@uefs.br");
        secondaryUser.setPassword(passwordEncoder.encode("OutraSenha@456"));
        secondaryUser.setTokenVersion(1);
        secondaryUser = userRepository.save(secondaryUser);

        entityManager.flush();
        entityManager.clear();
    }

    @Nested
    @DisplayName("[US23] Edição de Perfil (Nome e Foto)")
    class ProfileEditIntegrationScenarios {

        @Test
        @DisplayName("[US23] Ciclo completo de atualização de perfil com foto: atualiza banco e persiste arquivo físico no disco")
        void fullProfileUpdate_WithPhotoAndName_PersistsInDatabaseAndSavesFileToDisk() throws Exception {
            // Arrange
            byte[] photoPayload = "imagem-de-perfil-em-bytes-png".getBytes(StandardCharsets.UTF_8);
            MockMultipartFile photoPart = new MockMultipartFile(
                    "photo",
                    "nova_foto.png",
                    "image/png",
                    photoPayload
            );

            MockMultipartFile dataPart = new MockMultipartFile(
                    "data",
                    "",
                    MediaType.APPLICATION_JSON_VALUE,
                    "{\"name\":\"Marina Santos Atualizada\"}".getBytes(StandardCharsets.UTF_8)
            );

            // Act (Executa o PUT multipart)
            mockMvc.perform(multipart(HttpMethod.PUT, "/api/v1/users/me/profile")
                            .file(dataPart)
                            .file(photoPart)
                            .with(jwt().jwt(j -> j.subject(primaryUser.getId().toString()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Marina Santos Atualizada"))
                    .andExpect(jsonPath("$.email").value(primaryUser.getEmail()))
                    .andExpect(jsonPath("$.profilePictureUrl").isNotEmpty());

            entityManager.flush();
            entityManager.clear();

            // Assert no banco (Releitura direta do H2)
            User updatedInDb = userRepository.findById(primaryUser.getId()).orElseThrow();
            assertEquals("Marina Santos Atualizada", updatedInDb.getName());
            assertNotNull(updatedInDb.getProfilePictureUrl());
            assertTrue(updatedInDb.getProfilePictureUrl().endsWith(".png"));

            // Assert no disco (O arquivo físico precisa existir no diretório configurado)
            String savedFilename = updatedInDb.getProfilePictureUrl().substring(updatedInDb.getProfilePictureUrl().lastIndexOf("/") + 1);
            Path expectedDiskFile = tempUploadDir.resolve(savedFilename);
            assertTrue(Files.exists(expectedDiskFile), "O arquivo de upload deve existir fisicamente no disco");
            assertArrayEquals(photoPayload, Files.readAllBytes(expectedDiskFile), "O conteúdo gravado no disco deve ser fiel");
        }

        @Test
        @DisplayName("[US23] Isolamento: Usuário autenticado A não consegue alterar o perfil do Usuário B mesmo injetando 'userId' no payload")
        void userIsolation_UserCannotModifyAnotherUsersProfile_AlwaysUsesJwtSubject() throws Exception {
            // Arrange (O usuário A tenta alterar o nome do usuário B)
            String maliciousPayload = """
                    {
                        "name": "Nome Alterado Por Invasor",
                        "userId": "%s"
                    }
                    """.formatted(secondaryUser.getId());

            MockMultipartFile dataPart = new MockMultipartFile(
                    "data",
                    "",
                    MediaType.APPLICATION_JSON_VALUE,
                    maliciousPayload.getBytes(StandardCharsets.UTF_8)
            );

            // Act (Envia com JWT do usuário A)
            mockMvc.perform(multipart(HttpMethod.PUT, "/api/v1/users/me/profile")
                            .file(dataPart)
                            .with(jwt().jwt(j -> j.subject(primaryUser.getId().toString()))))
                    .andExpect(status().isOk());

            entityManager.flush();
            entityManager.clear();

            // Assert (O usuário A foi alterado, mas o usuário B permanece estritamente intocado)
            User userA = userRepository.findById(primaryUser.getId()).orElseThrow();
            assertEquals("Nome Alterado Por Invasor", userA.getName(), "O usuário do token teve seu nome atualizado");

            User userB = userRepository.findById(secondaryUser.getId()).orElseThrow();
            assertEquals("Aluno Secundário", userB.getName(), "O perfil da vítima B deve permanecer completamente inalterado");
        }
    }

    @Nested
    @DisplayName("[US23] Troca de Senha e Revogação de Sessões")
    class PasswordChangeIntegrationScenarios {

        @Test
        @DisplayName("[US23] Troca de senha completa: novo login funciona, login antigo é rejeitado e tokens emitidos antes da troca são revogados")
        void changePassword_FullLifecycle_OldLoginFailsNewLoginSucceedsAndPreviousJwtRevoked() throws Exception {
            // 1. Gera um token JWT para o usuário com a tokenVersion atual (versão 1)
            String oldJwtToken = jwtService.generateToken(primaryUser.getId(), primaryUser.getName(), primaryUser.getEmail(), primaryUser.getTokenVersion());

            // 2. Confirma que o token antigo tem acesso a uma rota protegida
            mockMvc.perform(get("/api/v1/rooms")
                            .header("Authorization", "Bearer " + oldJwtToken))
                    .andExpect(status().isOk());

            // 3. Efetua a troca de senha informando a senha atual
            String newPassword = "NovaSenhaForte@2026";
            ChangePasswordRequest changeRequest = new ChangePasswordRequest(INITIAL_PASSWORD, newPassword);

            mockMvc.perform(put("/api/v1/users/me/password")
                            .header("Authorization", "Bearer " + oldJwtToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(changeRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Senha alterada com sucesso."));

            entityManager.flush();
            entityManager.clear();

            // 4. Login com a senha antiga DEVE FALHAR (401 Unauthorized / Credenciais inválidas)
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new LoginRequest(primaryUser.getEmail(), INITIAL_PASSWORD))))
                    .andExpect(status().isUnauthorized());

            // 5. Login com a nova senha DEVE TER SUCESSO (200 OK)
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new LoginRequest(primaryUser.getEmail(), newPassword))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").isNotEmpty());

            // 6. SEGURANÇA CRÍTICA: O token JWT emitido ANTES da troca agora deve ser REJEITADO (401) devido ao tokenVersion defasado
            mockMvc.perform(get("/api/v1/rooms")
                            .header("Authorization", "Bearer " + oldJwtToken))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("[US23] Senha atual incorreta retorna 400 Bad Request e o hash no banco não é alterado")
        void changePassword_IncorrectCurrentPassword_Returns400AndKeepsPasswordHashIntact() throws Exception {
            // Arrange (Senha atual divergente da gravada)
            String originalHash = primaryUser.getPassword();
            ChangePasswordRequest badRequest = new ChangePasswordRequest("SenhaCompletamenteErrada", "NovaSenha@123");

            // Act
            mockMvc.perform(put("/api/v1/users/me/password")
                            .with(jwt().jwt(j -> j.subject(primaryUser.getId().toString()).claim("tokenVersion", 1)))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Senha atual incorreta."));

            entityManager.flush();
            entityManager.clear();

            // Assert (O hash da senha e a tokenVersion devem continuar intactos)
            User unchangedUser = userRepository.findById(primaryUser.getId()).orElseThrow();
            assertEquals(originalHash, unchangedUser.getPassword(), "O hash no banco não pode ser modificado após falha de autenticação");
            assertEquals(1, unchangedUser.getTokenVersion(), "A tokenVersion não pode ser alterada");
        }
    }

    @Nested
    @DisplayName("[US23] Prevenção de Vazamento de Dados Sensíveis")
    class DataLeakPrevention {

        @Test
        @DisplayName("[US23] Respostas de alteração de perfil e senha não devem expor senha, hash nem tokenVersion")
        void dataLeakPrevention_ProfileAndPasswordResponses_DoNotLeakSensitiveData() throws Exception {
            // Arrange
            MockMultipartFile dataPart = new MockMultipartFile(
                    "data",
                    "",
                    MediaType.APPLICATION_JSON_VALUE,
                    "{\"name\":\"Marina Teste Vazamento\"}".getBytes(StandardCharsets.UTF_8)
            );

            // Act (PUT /profile)
            String profileBody = mockMvc.perform(multipart(HttpMethod.PUT, "/api/v1/users/me/profile")
                            .file(dataPart)
                            .with(jwt().jwt(j -> j.subject(primaryUser.getId().toString()))))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

            assertThat(profileBody)
                    .doesNotContain("password")
                    .doesNotContain("tokenVersion")
                    .doesNotContain("SenhaForte");
        }
    }
}
