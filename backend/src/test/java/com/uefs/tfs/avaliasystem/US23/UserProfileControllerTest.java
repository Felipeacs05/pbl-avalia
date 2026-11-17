package com.uefs.tfs.avaliasystem.US23;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.UserProfileController;
import com.uefs.tfs.avaliasystem.dto.ChangePasswordRequest;
import com.uefs.tfs.avaliasystem.dto.UpdateProfileRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.UserProfileService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato assumido:
 * - Controller: UserProfileController
 * - Rotas protegidas (exigem autenticação JWT):
 *   - PUT /api/v1/users/me/profile (multipart: part "data" com UpdateProfileRequest + part opcional "photo")
 *     -> 200 OK UserResponse (id, name, email, profilePictureUrl).
 *     -> Usuário autenticado obtido sempre de Authentication / Principal (JWT Subject).
 *     -> Qualquer ID ou e-mail enviado no corpo da requisição é estritamente ignorado.
 *   - PUT /api/v1/users/me/password (JSON: ChangePasswordRequest { currentPassword, newPassword })
 *     -> 200 OK { message: "Senha alterada com sucesso." }
 * - Mocks necessários: UserRepository (usado pelo validador de JWT/tokenVersion) e UserProfileService.
 */
@WebMvcTest(UserProfileController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US23] Testes da Camada Web (UserProfileController)")
class UserProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private UserProfileService userProfileService;

    private static final String PROFILE_URL = "/api/v1/users/me/profile";
    private static final String PASSWORD_URL = "/api/v1/users/me/password";

    // --- ATUALIZAÇÃO DE PERFIL (PUT /profile) ---

    @Test
    @DisplayName("[US23] PUT /profile com dados válidos retorna 200 com campos atualizados e sem dados sensíveis")
    void updateProfile_ValidData_Returns200WithUpdatedFieldsWithoutSensitiveData() throws Exception {
        // Arrange
        UUID authenticatedUserId = UUID.randomUUID();
        UserResponse mockResponse = new UserResponse(
                authenticatedUserId,
                "Marina Silva",
                "marina@uefs.br",
                "/fotosPerfil/nova_foto.png"
        );

        when(userProfileService.updateProfile(eq(authenticatedUserId), any(UpdateProfileRequest.class), any()))
                .thenReturn(mockResponse);

        MockMultipartFile dataPart = new MockMultipartFile(
                "data",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                "{\"name\":\"Marina Silva\"}".getBytes(StandardCharsets.UTF_8)
        );

        MockMultipartFile photoPart = new MockMultipartFile(
                "photo",
                "foto.png",
                "image/png",
                "conteudo-foto".getBytes(StandardCharsets.UTF_8)
        );

        // Act & Assert
        String responseBody = mockMvc.perform(multipart(HttpMethod.PUT, PROFILE_URL)
                        .file(dataPart)
                        .file(photoPart)
                        .with(jwt().jwt(j -> j.subject(authenticatedUserId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(authenticatedUserId.toString()))
                .andExpect(jsonPath("$.name").value("Marina Silva"))
                .andExpect(jsonPath("$.email").value("marina@uefs.br"))
                .andExpect(jsonPath("$.profilePictureUrl").value("/fotosPerfil/nova_foto.png"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        // Prevenção de vazamento de dados sensíveis
        assertThat(responseBody)
                .doesNotContain("password")
                .doesNotContain("tokenVersion")
                .doesNotContain("hash");

        verify(userProfileService).updateProfile(eq(authenticatedUserId), any(UpdateProfileRequest.class), any());
    }

    @Test
    @DisplayName("[US23] PUT /profile sem autenticação JWT deve retornar 401 Unauthorized")
    void updateProfile_WithoutJwtToken_Returns401Unauthorized() throws Exception {
        // Arrange
        MockMultipartFile dataPart = new MockMultipartFile(
                "data",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                "{\"name\":\"Novo Nome\"}".getBytes(StandardCharsets.UTF_8)
        );

        // Act & Assert
        mockMvc.perform(multipart(HttpMethod.PUT, PROFILE_URL).file(dataPart))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(userProfileService);
    }

    @Test
    @DisplayName("[US23] PUT /profile com nome em branco deve retornar 400 Bad Request com validação do campo name")
    void updateProfile_BlankName_Returns400WithValidationErrors() throws Exception {
        // Arrange
        UUID authenticatedUserId = UUID.randomUUID();
        MockMultipartFile dataPart = new MockMultipartFile(
                "data",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                "{\"name\":\"\"}".getBytes(StandardCharsets.UTF_8)
        );

        // Act & Assert
        mockMvc.perform(multipart(HttpMethod.PUT, PROFILE_URL)
                        .file(dataPart)
                        .with(jwt().jwt(j -> j.subject(authenticatedUserId.toString()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.name").exists());

        verify(userProfileService, never()).updateProfile(any(), any(), any());
    }

    @Test
    @DisplayName("[US23] PUT /profile com 'userId' malicioso no corpo deve ignorar o ID do payload e usar o Subject do JWT")
    void updateProfile_BodyWithSpoofedUserId_IgnoresBodyIdAndUsesJwtSubject() throws Exception {
        // Arrange (O invasor envia o ID de outro usuário no payload JSON)
        UUID authenticatedUserId = UUID.randomUUID();
        UUID victimUserId = UUID.randomUUID();

        String payloadWithVictimId = """
                {
                    "name": "Nome Invasor",
                    "userId": "%s",
                    "email": "vitima@uefs.br"
                }
                """.formatted(victimUserId);

        MockMultipartFile dataPart = new MockMultipartFile(
                "data",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                payloadWithVictimId.getBytes(StandardCharsets.UTF_8)
        );

        when(userProfileService.updateProfile(eq(authenticatedUserId), any(UpdateProfileRequest.class), any()))
                .thenReturn(new UserResponse(authenticatedUserId, "Nome Invasor", "autenticado@uefs.br", null));

        // Act
        mockMvc.perform(multipart(HttpMethod.PUT, PROFILE_URL)
                        .file(dataPart)
                        .with(jwt().jwt(j -> j.subject(authenticatedUserId.toString()))))
                .andExpect(status().isOk());

        // Assert (O serviço DEVE ser invocado unicamente com o ID do JWT autenticado, nunca com o ID do corpo)
        verify(userProfileService, times(1)).updateProfile(eq(authenticatedUserId), any(), any());
        verify(userProfileService, never()).updateProfile(eq(victimUserId), any(), any());
    }

    @Test
    @DisplayName("[US23] PUT /profile com arquivo excedendo o limite de upload deve retornar 400 com mensagem padrão")
    void updateProfile_MaxUploadSizeExceeded_Returns400WithFileSizeMessage() throws Exception {
        // Arrange
        UUID authenticatedUserId = UUID.randomUUID();
        when(userProfileService.updateProfile(any(), any(), any()))
                .thenThrow(new MaxUploadSizeExceededException(5 * 1024 * 1024));

        MockMultipartFile dataPart = new MockMultipartFile(
                "data",
                "",
                MediaType.APPLICATION_JSON_VALUE,
                "{\"name\":\"Nome\"}".getBytes(StandardCharsets.UTF_8)
        );
        MockMultipartFile hugeFile = new MockMultipartFile(
                "photo",
                "gigante.jpg",
                "image/jpeg",
                new byte[10]
        );

        // Act & Assert
        mockMvc.perform(multipart(HttpMethod.PUT, PROFILE_URL)
                        .file(dataPart)
                        .file(hugeFile)
                        .with(jwt().jwt(j -> j.subject(authenticatedUserId.toString()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("File exceeds maximum upload limit of 5MB"));
    }

    // --- ALTERAÇÃO DE SENHA (PUT /password) ---

    @Test
    @DisplayName("[US23] PUT /password com dados válidos retorna 200 e mensagem de confirmação")
    void changePassword_ValidRequest_Returns200WithSuccessMessage() throws Exception {
        // Arrange
        UUID authenticatedUserId = UUID.randomUUID();
        ChangePasswordRequest request = new ChangePasswordRequest("senhaAntiga123", "novaSenhaForte456");

        // Act & Assert
        mockMvc.perform(put(PASSWORD_URL)
                        .with(jwt().jwt(j -> j.subject(authenticatedUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Senha alterada com sucesso."));

        verify(userProfileService, times(1)).changePassword(eq(authenticatedUserId), eq(request));
    }

    @Test
    @DisplayName("[US23] PUT /password com campos em branco deve retornar 400 Bad Request com validação")
    void changePassword_BlankNewPassword_Returns400WithValidationErrors() throws Exception {
        // Arrange
        UUID authenticatedUserId = UUID.randomUUID();
        ChangePasswordRequest request = new ChangePasswordRequest("senhaAtual123", "");

        // Act & Assert
        mockMvc.perform(put(PASSWORD_URL)
                        .with(jwt().jwt(j -> j.subject(authenticatedUserId.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.newPassword").exists());

        verify(userProfileService, never()).changePassword(any(), any());
    }

    @Test
    @DisplayName("[US23] PUT /password sem autenticação JWT deve retornar 401 Unauthorized")
    void changePassword_WithoutJwtToken_Returns401Unauthorized() throws Exception {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest("senhaAtual123", "novaSenha123");

        // Act & Assert
        mockMvc.perform(put(PASSWORD_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(userProfileService);
    }
}
