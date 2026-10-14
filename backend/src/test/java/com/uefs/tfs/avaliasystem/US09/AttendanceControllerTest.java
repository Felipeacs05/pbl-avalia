package com.uefs.tfs.avaliasystem.US09;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.AttendanceController;
import com.uefs.tfs.avaliasystem.dto.AttendanceRequest;
import com.uefs.tfs.avaliasystem.dto.AttendanceResponse;
import com.uefs.tfs.avaliasystem.model.AttendanceStatus;
import com.uefs.tfs.avaliasystem.service.AttendanceService;
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
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Fatia da camada web (rota, JSON, mapeamento de exceções); o Service é mockado.
// A SecurityConfig real é importada, então o "sub" do JWT é o que chega em principal.getName()
@WebMvcTest(AttendanceController.class)
@Import(SecurityConfig.class)
@TestConfig
@DisplayName("[US09] Controller de registro de chamada")
class AttendanceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AttendanceService attendanceService;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID OTHER_TUTOR_UUID = UUID.fromString("444e4444-e44b-44d4-a444-444444444444");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-99d9-a999-999999999999");
    private final UUID SESSION_UUID = UUID.fromString("777e7777-e77b-77d7-a777-777777777777");
    private final UUID ATTENDANCE_UUID = UUID.fromString("333e3333-e33b-33d3-a333-333333333333");

    private static final String ROUTE = "/api/v1/sessions/{sessionId}/attendances/{studentId}";
    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode registrar a chamada.";

    // --- SUCESSO ---

    @Test
    @DisplayName("Deve encaminhar sessão, aluno, status e usuário do JWT ao Service e retornar 200 com o registro")
    void registerAttendance_WithValidBody_Returns200WithRecord() throws Exception {
        Instant recordedAt = Instant.parse("2026-10-07T18:00:00Z");
        AttendanceResponse response = new AttendanceResponse(
                ATTENDANCE_UUID, SESSION_UUID, STUDENT_UUID, "Aluno Teste", AttendanceStatus.LATE, recordedAt);

        Mockito.when(attendanceService.registerAttendance(
                        eq(SESSION_UUID), eq(STUDENT_UUID), any(AttendanceRequest.class), eq(TUTOR_UUID)))
                .thenReturn(response);

        mockMvc.perform(put(ROUTE, SESSION_UUID, STUDENT_UUID)
                        .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AttendanceRequest(AttendanceStatus.LATE))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ATTENDANCE_UUID.toString()))
                .andExpect(jsonPath("$.sessionId").value(SESSION_UUID.toString()))
                .andExpect(jsonPath("$.studentId").value(STUDENT_UUID.toString()))
                .andExpect(jsonPath("$.studentName").value("Aluno Teste"))
                .andExpect(jsonPath("$.status").value("LATE"))
                // O horário sai em ISO-8601 (UTC), pronto para o front exibir
                .andExpect(jsonPath("$.recordedAt").value("2026-10-07T18:00:00Z"));

        // Corpo desserializado, path variables e usuário autenticado precisam chegar ao Service
        verify(attendanceService).registerAttendance(
                eq(SESSION_UUID), eq(STUDENT_UUID),
                argThat(r -> r.getStatus() == AttendanceStatus.LATE), eq(TUTOR_UUID));
    }

    // --- RECUSAS ---

    @Test
    @DisplayName("Deve retornar 403 com a mensagem quando o usuário não é o tutor da sala")
    void registerAttendance_ByTutorOfAnotherRoom_Returns403() throws Exception {
        Mockito.when(attendanceService.registerAttendance(
                        eq(SESSION_UUID), eq(STUDENT_UUID), any(AttendanceRequest.class), eq(OTHER_TUTOR_UUID)))
                .thenThrow(new SecurityException(NOT_TUTOR_MESSAGE));

        mockMvc.perform(put(ROUTE, SESSION_UUID, STUDENT_UUID)
                        .with(jwt().jwt(j -> j.subject(OTHER_TUTOR_UUID.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AttendanceRequest(AttendanceStatus.ABSENT))))
                .andExpect(status().isForbidden())
                // O 403 do GlobalExceptionHandler é texto puro, não JSON
                .andExpect(content().string(NOT_TUTOR_MESSAGE));

        // A regra de posse é do Service: o usuário do JWT precisa ter chegado até ele
        verify(attendanceService).registerAttendance(
                eq(SESSION_UUID), eq(STUDENT_UUID),
                argThat(r -> r.getStatus() == AttendanceStatus.ABSENT), eq(OTHER_TUTOR_UUID));
    }
}
