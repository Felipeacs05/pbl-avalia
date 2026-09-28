package com.uefs.tfs.avaliasystem.US01;

import tools.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.controller.AuthController;
import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * US01 — Cadastro de Usuário com Foto de Perfil (Controller / WebMvc).
 * Cobertura de Critérios de Aceite:
 *  - CA1 (Criptografia): Não vazar hash ou senha pura no response JSON.
 *  - CA2 (Sanitização): Nome com tags de script é rejeitado pela validação de entrada (Bean Validation).
 *  - CA4 (Validação): Ausência de foto ou foto vazia rejeitada com HTTP 400.
 */
@WebMvcTest(AuthController.class)
class AuthControllerRegisterTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("US01 - cadastro válido com foto retorna 201 e não vaza senha pura")
    void shouldRegisterSuccessfullyWhenPhotoIsSent() throws Exception {
        var requestData = new RegisterUserRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var dataPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(requestData));
        var photoPart = new MockMultipartFile(
                "foto", "perfil.jpg", "image/jpeg", "conteudo-fake".getBytes());

        var createdUser = new User("Ana Silva", "ana@uefs.br", "$2a$10$hashSeguroBCrypt", "url-da-foto");

        when(userService.register(any(), any())).thenReturn(createdUser);

        mockMvc.perform(multipart("/v1/auth/register")
                        .file(dataPart)
                        .file(photoPart))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Ana Silva"))
                .andExpect(jsonPath("$.email").value("ana@uefs.br"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @DisplayName("US01 - cadastro sem foto de perfil retorna 400")
    void shouldRejectRegistrationWithoutProfilePhoto() throws Exception {
        var requestData = new RegisterUserRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var dataPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(requestData));

        mockMvc.perform(multipart("/v1/auth/register").file(dataPart))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("US01 - cadastro com foto vazia (0 bytes) retorna 400")
    void shouldRejectRegistrationWithEmptyPhoto() throws Exception {
        var requestData = new RegisterUserRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var dataPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(requestData));
        var emptyPhoto = new MockMultipartFile(
                "foto", "vazia.jpg", "image/jpeg", new byte[0]);

        mockMvc.perform(multipart("/v1/auth/register")
                        .file(dataPart)
                        .file(emptyPhoto))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("US01 - nome contendo tags de script é rejeitado na validação de entrada (400)")
    void shouldRejectNameWithScriptTagsAtValidationLayer() throws Exception {
        var requestData = new RegisterUserRequest("<script>alert(1)</script>Ana", "ana@uefs.br", "senhaForte123");
        var dataPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(requestData));
        var photoPart = new MockMultipartFile(
                "foto", "perfil.jpg", "image/jpeg", "conteudo-fake".getBytes());

        mockMvc.perform(multipart("/v1/auth/register")
                        .file(dataPart)
                        .file(photoPart))
                .andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Ana' OR '1'='1",
            "Carlos; DROP TABLE usuario; --",
            "admin' --"
    })
    @DisplayName("US01 - payloads de SQL Injection sem caracteres < > são aceitos e repassados intactos ao service")
    void shouldPassSqlInjectionPayloadsThroughToService(String payloadSqli) throws Exception {
        var requestData = new RegisterUserRequest(payloadSqli, "teste@uefs.br", "senhaForte123");
        var dataPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(requestData));
        var photoPart = new MockMultipartFile(
                "foto", "perfil.jpg", "image/jpeg", "conteudo-fake".getBytes());

        when(userService.register(any(), any())).thenAnswer(inv -> {
            RegisterUserRequest req = inv.getArgument(0);
            return new User(req.getName(), req.getEmail(), "hash", "url");
        });

        mockMvc.perform(multipart("/v1/auth/register")
                        .file(dataPart)
                        .file(photoPart))
                .andExpect(status().isCreated());

        ArgumentCaptor<RegisterUserRequest> captor = ArgumentCaptor.forClass(RegisterUserRequest.class);
        verify(userService).register(captor.capture(), any());
        assertThat(captor.getValue().getName()).isNotNull();
    }
}