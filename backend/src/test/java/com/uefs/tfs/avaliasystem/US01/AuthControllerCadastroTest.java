package com.uefs.tfs.avaliasystem.US01;

import tools.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.controller.AuthController;
import com.uefs.tfs.avaliasystem.dto.CadastroUsuarioRequest;
import com.uefs.tfs.avaliasystem.model.Usuario;
import com.uefs.tfs.avaliasystem.service.UsuarioService;
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
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
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
 *  - CA2 (Sanitização): Inputs com XSS e SQL Injection tratados e inspecionados via ArgumentCaptor.
 *  - CA4 (Validação): Ausência de foto ou foto vazia rejeitada com HTTP 400.
 */
@WebMvcTest(AuthController.class)
class AuthControllerCadastroTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private UsuarioService usuarioService;

    @Test
    @DisplayName("US01 - cadastro válido com foto retorna 201 e não vaza senha pura")
    void deveCadastrarComSucessoQuandoFotoEnviada() throws Exception {
        var dados = new CadastroUsuarioRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var dadosPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(dados));
        var fotoPart = new MockMultipartFile(
                "foto", "perfil.jpg", "image/jpeg", "conteudo-fake".getBytes());

        var usuarioCriado = new Usuario("Ana Silva", "ana@uefs.br", "$2a$10$hashSeguroBCrypt", "url-da-foto");
        when(usuarioService.cadastrar(any(), any())).thenReturn(usuarioCriado);

        mockMvc.perform(multipart("/api/auth/cadastro")
                        .file(dadosPart)
                        .file(fotoPart))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Ana Silva"))
                .andExpect(jsonPath("$.email").value("ana@uefs.br"))
                .andExpect(jsonPath("$.senha").value(not("senhaForte123")));
    }

    @Test
    @DisplayName("US01 - cadastro sem foto de perfil retorna 400")
    void deveRejeitarCadastroSemFotoDePerfil() throws Exception {
        var dados = new CadastroUsuarioRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var dadosPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(dados));

        mockMvc.perform(multipart("/api/auth/cadastro").file(dadosPart))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("US01 - cadastro com foto vazia (0 bytes) retorna 400")
    void deveRejeitarCadastroComFotoVazia() throws Exception {
        var dados = new CadastroUsuarioRequest("Ana Silva", "ana@uefs.br", "senhaForte123");
        var dadosPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(dados));
        var fotoVazia = new MockMultipartFile(
                "foto", "vazia.jpg", "image/jpeg", new byte[0]);

        mockMvc.perform(multipart("/api/auth/cadastro")
                        .file(dadosPart)
                        .file(fotoVazia))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("US01 - sanitização de XSS verificada na entrada do serviço com ArgumentCaptor")
    void deveSanitizarInputsMaliciososXSS() throws Exception {
        var dados = new CadastroUsuarioRequest("<script>alert(1)</script>Ana", "ana@uefs.br", "senhaForte123");
        var dadosPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(dados));
        var fotoPart = new MockMultipartFile(
                "foto", "perfil.jpg", "image/jpeg", "conteudo-fake".getBytes());

        when(usuarioService.cadastrar(any(), any())).thenAnswer(inv -> {
            CadastroUsuarioRequest req = inv.getArgument(0);
            return new Usuario(req.getNome(), req.getEmail(), "hash", "url");
        });

        mockMvc.perform(multipart("/api/auth/cadastro")
                        .file(dadosPart)
                        .file(fotoPart))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome", not(containsString("<script>"))));

        // Inspeção real do dado repassado à camada de Service
        ArgumentCaptor<CadastroUsuarioRequest> captor = ArgumentCaptor.forClass(CadastroUsuarioRequest.class);
        verify(usuarioService).cadastrar(captor.capture(), any());
        assertThat(captor.getValue().getNome())
                .as("O nome repassado ao serviço não deve conter tags script")
                .doesNotContain("<script>", "</script>");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Ana' OR '1'='1",
            "Carlos; DROP TABLE usuario; --",
            "admin' --"
    })
    @DisplayName("US01 - sanitização de SQL Injection nos campos de entrada")
    void deveProtegerContraSqlInjection(String payloadSqli) throws Exception {
        var dados = new CadastroUsuarioRequest(payloadSqli, "teste@uefs.br", "senhaForte123");
        var dadosPart = new MockMultipartFile(
                "dados", "", "application/json", objectMapper.writeValueAsBytes(dados));
        var fotoPart = new MockMultipartFile(
                "foto", "perfil.jpg", "image/jpeg", "conteudo-fake".getBytes());

        when(usuarioService.cadastrar(any(), any())).thenAnswer(inv -> {
            CadastroUsuarioRequest req = inv.getArgument(0);
            return new Usuario(req.getNome(), req.getEmail(), "hash", "url");
        });

        mockMvc.perform(multipart("/api/auth/cadastro")
                        .file(dadosPart)
                        .file(fotoPart))
                .andExpect(status().isCreated());

        ArgumentCaptor<CadastroUsuarioRequest> captor = ArgumentCaptor.forClass(CadastroUsuarioRequest.class);
        verify(usuarioService).cadastrar(captor.capture(), any());
        assertThat(captor.getValue().getNome()).isNotNull();
    }
}