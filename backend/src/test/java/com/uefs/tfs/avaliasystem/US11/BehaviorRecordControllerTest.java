package com.uefs.tfs.avaliasystem.US11;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.BehaviorRecordController;
import com.uefs.tfs.avaliasystem.dto.BehaviorRecordRequest;
import com.uefs.tfs.avaliasystem.dto.BehaviorRecordResponse;
import com.uefs.tfs.avaliasystem.dto.BehaviorTagResponse;
import com.uefs.tfs.avaliasystem.service.BehaviorRecordService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Fatia da camada web (rota, JSON, validação do corpo, mapeamento de exceções); o Service é mockado.
// A SecurityConfig real é importada, então o "sub" do JWT é o que chega em principal.getName()
@WebMvcTest(BehaviorRecordController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US11] Controller de registro de comportamento")
class BehaviorRecordControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private BehaviorRecordService behaviorRecordService;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID OTHER_TUTOR_UUID = UUID.fromString("444e4444-e44b-44d4-a444-444444444444");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-99d9-a999-999999999999");
    private final UUID ROOM_UUID = UUID.fromString("987e6543-e21b-12d3-a456-426614174000");
    private final UUID SESSION_UUID = UUID.fromString("777e7777-e77b-77d7-a777-777777777777");
    private final UUID TAG_UUID = UUID.fromString("888e8888-e88b-88d8-a888-888888888888");
    private final UUID OTHER_TAG_UUID = UUID.fromString("111e1111-e11b-11d1-a111-111111111111");
    private final UUID RECORD_UUID = UUID.fromString("222e2222-e22b-22d2-a222-222222222222");

    private final Instant RECORDED_AT = Instant.parse("2026-10-12T14:00:00Z");

    private static final String TAGS_ROUTE = "/api/v1/rooms/{roomId}/behavior-tags";
    private static final String RECORDS_ROUTE = "/api/v1/sessions/{sessionId}/students/{studentId}/behavior-records";
    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode registrar comportamentos.";
    private static final String TEXT_TOO_LONG_MESSAGE = "O texto deve ter no máximo 500 caracteres.";

    // --- TAGS PREDEFINIDAS ---

    @Test
    @DisplayName("Deve retornar 200 com as tags predefinidas, com id e nome")
    void listBehaviorTags_Returns200WithTags() throws Exception {
        Mockito.when(behaviorRecordService.listBehaviorTags(ROOM_UUID)).thenReturn(List.of(
                new BehaviorTagResponse(TAG_UUID, "Atraso"),
                new BehaviorTagResponse(OTHER_TAG_UUID, "Celular fora de contexto")));

        mockMvc.perform(get(TAGS_ROUTE, ROOM_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(TAG_UUID.toString()))
                .andExpect(jsonPath("$[0].name").value("Atraso"))
                .andExpect(jsonPath("$[1].id").value(OTHER_TAG_UUID.toString()))
                .andExpect(jsonPath("$[1].name").value("Celular fora de contexto"));
    }

    // --- REGISTRO ---

    @Test
    @DisplayName("Deve encaminhar sessão, aluno, tag e usuário do JWT ao Service e retornar 201 com o registro")
    void createBehaviorRecord_WithTag_Returns201WithRecord() throws Exception {
        BehaviorRecordResponse response = new BehaviorRecordResponse(
                RECORD_UUID, SESSION_UUID, STUDENT_UUID, "Aluno Teste", TAG_UUID, "Atraso", null, RECORDED_AT);

        Mockito.when(behaviorRecordService.createBehaviorRecord(
                        eq(SESSION_UUID), eq(STUDENT_UUID), any(BehaviorRecordRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        mockMvc.perform(post(RECORDS_ROUTE, SESSION_UUID, STUDENT_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BehaviorRecordRequest(TAG_UUID, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(RECORD_UUID.toString()))
                .andExpect(jsonPath("$.sessionId").value(SESSION_UUID.toString()))
                .andExpect(jsonPath("$.studentId").value(STUDENT_UUID.toString()))
                .andExpect(jsonPath("$.studentName").value("Aluno Teste"))
                .andExpect(jsonPath("$.tagId").value(TAG_UUID.toString()))
                .andExpect(jsonPath("$.tagName").value("Atraso"))
                // O horário sai em ISO-8601 (UTC), pronto para o front exibir
                .andExpect(jsonPath("$.recordedAt").value("2026-10-12T14:00:00Z"));

        // Corpo desserializado, path variables e usuário autenticado precisam chegar ao Service
        verify(behaviorRecordService).createBehaviorRecord(
                eq(SESSION_UUID), eq(STUDENT_UUID),
                argThat(r -> TAG_UUID.equals(r.getTagId()) && r.getText() == null), eq(TUTOR_UUID));
    }

    // --- LIMITE DO TEXTO LIVRE ---

    @Test
    @DisplayName("[QA] Deve aceitar e encaminhar ao Service um texto livre com exatamente 500 caracteres")
    void createBehaviorRecord_WithTextAtLimit_Returns201() throws Exception {
        String textAtLimit = "x".repeat(499) + "!";
        BehaviorRecordResponse response = new BehaviorRecordResponse(
                RECORD_UUID, SESSION_UUID, STUDENT_UUID, "Aluno Teste", null, null, textAtLimit, RECORDED_AT);

        Mockito.when(behaviorRecordService.createBehaviorRecord(
                        eq(SESSION_UUID), eq(STUDENT_UUID), any(BehaviorRecordRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        mockMvc.perform(post(RECORDS_ROUTE, SESSION_UUID, STUDENT_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BehaviorRecordRequest(null, textAtLimit))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.text").value(textAtLimit));

        // O texto chega inteiro: o limite não pode cortar nem recusar o caso de borda
        verify(behaviorRecordService).createBehaviorRecord(
                eq(SESSION_UUID), eq(STUDENT_UUID),
                argThat(r -> textAtLimit.equals(r.getText()) && r.getTagId() == null), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[QA] Deve bloquear com 400 e não chamar o Service quando o texto livre passa de 500 caracteres")
    void createBehaviorRecord_WithTextOverLimit_Returns400WithoutCallingService() throws Exception {
        String textOverLimit = "x".repeat(501);

        mockMvc.perform(post(RECORDS_ROUTE, SESSION_UUID, STUDENT_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BehaviorRecordRequest(null, textOverLimit))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.text").value(TEXT_TOO_LONG_MESSAGE));

        // A requisição é barrada na borda da API: nada chega à regra de negócio nem ao banco
        Mockito.verifyNoInteractions(behaviorRecordService);
    }

    // --- RECUSAS ---

    @Test
    @DisplayName("Deve retornar 403 com a mensagem quando o usuário não é o tutor da sala")
    void createBehaviorRecord_ByTutorOfAnotherRoom_Returns403() throws Exception {
        Mockito.when(behaviorRecordService.createBehaviorRecord(
                        eq(SESSION_UUID), eq(STUDENT_UUID), any(BehaviorRecordRequest.class), eq(OTHER_TUTOR_UUID)))
                .thenThrow(new SecurityException(NOT_TUTOR_MESSAGE));

        mockMvc.perform(post(RECORDS_ROUTE, SESSION_UUID, STUDENT_UUID)
                        .with(jwt().jwt(j -> j.subject(OTHER_TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BehaviorRecordRequest(TAG_UUID, null))))
                .andExpect(status().isForbidden())
                // O 403 do GlobalExceptionHandler é texto puro, não JSON
                .andExpect(content().string(NOT_TUTOR_MESSAGE));

        // A regra de posse é do Service: o usuário do JWT precisa ter chegado até ele
        verify(behaviorRecordService).createBehaviorRecord(
                eq(SESSION_UUID), eq(STUDENT_UUID),
                argThat(r -> TAG_UUID.equals(r.getTagId())), eq(OTHER_TUTOR_UUID));
    }
}
