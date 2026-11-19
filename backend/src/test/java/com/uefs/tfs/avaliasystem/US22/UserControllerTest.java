package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.UserController;
import com.uefs.tfs.avaliasystem.dto.ChangeEmailRequest;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.exception.ResourceConflictException;
import com.uefs.tfs.avaliasystem.exception.UserNotFoundException;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US22] Alteração de e-mail de conta não verificada")
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private UserService userService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final UUID USER_ID = UUID.fromString("555e4567-e89b-12d3-a456-426614174000");
    private static final String URL = "/api/v1/users/me/email";

    @Test
    @DisplayName("Conta não verificada pode alterar o e-mail e recebe 200 com o novo endereço")
    void changeEmail_UnverifiedAccount_Returns200WithNewEmail() throws Exception {
        String newEmail = "email.corrigido@uefs.br";
        UserResponse response = new UserResponse(USER_ID, "Ana Silva", newEmail, null);

        when(userService.changeEmail(USER_ID, newEmail)).thenReturn(response);

        mockMvc.perform(patch(URL)
                        .with(jwt().jwt(j -> j.subject(USER_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangeEmailRequest(newEmail))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(newEmail));

        verify(userService).changeEmail(USER_ID, newEmail);
    }

    @Test
    @DisplayName("Conta já verificada não pode alterar o e-mail: 409 Conflict")
    void changeEmail_VerifiedAccount_Returns409() throws Exception {
        String newEmail = "outro@uefs.br";

        when(userService.changeEmail(USER_ID, newEmail))
                .thenThrow(new ResourceConflictException(
                        "Não é possível alterar o e-mail de uma conta já verificada."));

        mockMvc.perform(patch(URL)
                        .with(jwt().jwt(j -> j.subject(USER_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangeEmailRequest(newEmail))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("Não é possível alterar o e-mail de uma conta já verificada."));
    }

    @Test
    @DisplayName("Conta inexistente retorna 404 Not Found")
    void changeEmail_UnknownAccount_Returns404() throws Exception {
        String newEmail = "outro@uefs.br";

        when(userService.changeEmail(USER_ID, newEmail))
                .thenThrow(new UserNotFoundException("Usuário não encontrado."));

        mockMvc.perform(patch(URL)
                        .with(jwt().jwt(j -> j.subject(USER_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangeEmailRequest(newEmail))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Usuário não encontrado."));
    }

    @Test
    @DisplayName("E-mail já usado por outra conta retorna 409 Conflict")
    void changeEmail_EmailAlreadyInUse_Returns409() throws Exception {
        String newEmail = "ocupado@uefs.br";

        when(userService.changeEmail(USER_ID, newEmail))
                .thenThrow(new ResourceConflictException("Este e-mail já está em uso."));

        mockMvc.perform(patch(URL)
                        .with(jwt().jwt(j -> j.subject(USER_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangeEmailRequest(newEmail))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Este e-mail já está em uso."));
    }

    @Test
    @DisplayName("E-mail malformado retorna 400 e não chama o serviço")
    void changeEmail_MalformedEmail_Returns400() throws Exception {
        mockMvc.perform(patch(URL)
                        .with(jwt().jwt(j -> j.subject(USER_ID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangeEmailRequest("sem-arroba"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.email").exists());

        verify(userService, never()).changeEmail(any(), any());
    }

    @Test
    @DisplayName("Requisição sem JWT retorna 401")
    void changeEmail_WithoutJwt_Returns401() throws Exception {
        mockMvc.perform(patch(URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangeEmailRequest("novo@uefs.br"))))
                .andExpect(status().isUnauthorized());

        verify(userService, never()).changeEmail(any(), any());
    }
}
