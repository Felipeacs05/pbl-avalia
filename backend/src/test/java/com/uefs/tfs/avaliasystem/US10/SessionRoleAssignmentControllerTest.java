package com.uefs.tfs.avaliasystem.US10;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.SessionRoleAssignmentController;
import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentRequest;
import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentResponse;
import com.uefs.tfs.avaliasystem.exception.SessionRoleConflictException;
import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.service.SessionRoleAssignmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Fatia da camada web (rota, JSON, mapeamento de exceções); o Service é mockado.
// A SecurityConfig real é importada, então o "sub" do JWT é o que chega em principal.getName()
@WebMvcTest(SessionRoleAssignmentController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US10] Controller de papéis da sessão")
class SessionRoleAssignmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private SessionRoleAssignmentService sessionRoleAssignmentService;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID OTHER_TUTOR_UUID = UUID.fromString("444e4444-e44b-44d4-a444-444444444444");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-99d9-a999-999999999999");
    private final UUID SESSION_UUID = UUID.fromString("777e7777-e77b-77d7-a777-777777777777");
    private final UUID ASSIGNMENT_UUID = UUID.fromString("222e2222-e22b-22d2-a222-222222222222");

    private static final String ROUTE = "/api/v1/sessions/{sessionId}/roles/{role}";
    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode atribuir papéis da sessão.";
    private static final String ROLE_TAKEN_MESSAGE = "Este papel já foi atribuído a outro aluno nesta sessão.";
    private static final String INACTIVE_MESSAGE = "O aluno não possui vínculo ativo com a sala informada";

    // --- SUCESSO ---

    @Test
    @DisplayName("Deve encaminhar sessão, papel, aluno, nota extra e usuário do JWT ao Service e retornar 201 com a atribuição")
    void assignRole_WithValidBody_Returns201WithAssignment() throws Exception {
        SessionRoleAssignmentResponse response = new SessionRoleAssignmentResponse(
                ASSIGNMENT_UUID, SESSION_UUID, STUDENT_UUID, "Aluno Teste", SessionRole.BOARD_SECRETARY, 0.5);

        Mockito.when(sessionRoleAssignmentService.assignRole(
                        eq(SESSION_UUID), eq(SessionRole.BOARD_SECRETARY), any(SessionRoleAssignmentRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        mockMvc.perform(put(ROUTE, SESSION_UUID, "BOARD_SECRETARY")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SessionRoleAssignmentRequest(STUDENT_UUID, 0.5))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(ASSIGNMENT_UUID.toString()))
                .andExpect(jsonPath("$.sessionId").value(SESSION_UUID.toString()))
                .andExpect(jsonPath("$.studentId").value(STUDENT_UUID.toString()))
                .andExpect(jsonPath("$.studentName").value("Aluno Teste"))
                .andExpect(jsonPath("$.role").value("BOARD_SECRETARY"))
                .andExpect(jsonPath("$.extraGrade").value(0.5));

        // Corpo desserializado, papel da URL convertido no enum e usuário autenticado precisam chegar ao Service
        verify(sessionRoleAssignmentService).assignRole(
                eq(SESSION_UUID), eq(SessionRole.BOARD_SECRETARY),
                argThat(r -> STUDENT_UUID.equals(r.getStudentId()) && r.getExtraGrade() == 0.5),
                eq(TUTOR_UUID));
    }

    // --- RECUSAS ---

    @Test
    @DisplayName("[QA] Deve retornar 422 com a mensagem quando o papel de Secretário já está com outro aluno na sessão")
    void assignRole_RoleAlreadyTaken_Returns422() throws Exception {
        Mockito.when(sessionRoleAssignmentService.assignRole(
                        eq(SESSION_UUID), eq(SessionRole.BOARD_SECRETARY), any(SessionRoleAssignmentRequest.class), eq(TUTOR_UUID)))
                .thenThrow(new SessionRoleConflictException(ROLE_TAKEN_MESSAGE));

        mockMvc.perform(put(ROUTE, SESSION_UUID, "BOARD_SECRETARY")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SessionRoleAssignmentRequest(STUDENT_UUID, 0.5))))
                // is(422): o nome do matcher mudou entre versões do Spring
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.message").value(ROLE_TAKEN_MESSAGE));
    }

    @Test
    @DisplayName("Deve retornar 400 com a mensagem quando o aluno não é ativo na sala")
    void assignRole_ToInactiveStudent_Returns400() throws Exception {
        Mockito.when(sessionRoleAssignmentService.assignRole(
                        eq(SESSION_UUID), eq(SessionRole.COORDINATOR), any(SessionRoleAssignmentRequest.class), eq(TUTOR_UUID)))
                .thenThrow(new IllegalArgumentException(INACTIVE_MESSAGE));

        mockMvc.perform(put(ROUTE, SESSION_UUID, "COORDINATOR")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SessionRoleAssignmentRequest(STUDENT_UUID, 1.0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(INACTIVE_MESSAGE));
    }

    @Test
    @DisplayName("Deve retornar 403 com a mensagem quando o usuário não é o tutor da sala")
    void assignRole_ByTutorOfAnotherRoom_Returns403() throws Exception {
        Mockito.when(sessionRoleAssignmentService.assignRole(
                        eq(SESSION_UUID), eq(SessionRole.COORDINATOR), any(SessionRoleAssignmentRequest.class), eq(OTHER_TUTOR_UUID)))
                .thenThrow(new SecurityException(NOT_TUTOR_MESSAGE));

        mockMvc.perform(put(ROUTE, SESSION_UUID, "COORDINATOR")
                        .with(jwt().jwt(j -> j.subject(OTHER_TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SessionRoleAssignmentRequest(STUDENT_UUID, 1.0))))
                .andExpect(status().isForbidden())
                // O 403 do GlobalExceptionHandler é texto puro, não JSON
                .andExpect(content().string(NOT_TUTOR_MESSAGE));

        // A regra de posse é do Service: o usuário do JWT precisa ter chegado até ele
        verify(sessionRoleAssignmentService).assignRole(
                eq(SESSION_UUID), eq(SessionRole.COORDINATOR), any(SessionRoleAssignmentRequest.class), eq(OTHER_TUTOR_UUID));
    }

    @ParameterizedTest(name = "[{index}] nota extra {0}")
    @NullSource
    @ValueSource(doubles = {-0.5, 10.5})
    @DisplayName("Deve validar o DTO e retornar 400 sem acionar o Service quando a nota extra está ausente ou fora de 0 a 10")
    void assignRole_WithExtraGradeMissingOrOutOfRange_Returns400(Double extraGrade) throws Exception {
        mockMvc.perform(put(ROUTE, SESSION_UUID, "COORDINATOR")
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SessionRoleAssignmentRequest(STUDENT_UUID, extraGrade))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.extraGrade").exists());

        verify(sessionRoleAssignmentService, never()).assignRole(any(), any(), any(), any());
    }
}