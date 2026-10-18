package com.uefs.tfs.avaliasystem.US05;

import tools.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.controller.ProblemController;
import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.dto.ProblemResponse;
import com.uefs.tfs.avaliasystem.service.ProblemService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Web layer slice only (routes, JSON, validation, exception mapping); the Service is mocked
@WebMvcTest(ProblemController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProblemControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ProblemService problemService;

    private Principal tutorPrincipal;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-99d9-a999-999999999999");
    private final UUID ROOM_UUID = UUID.fromString("987e6543-e21b-12d3-a456-426614174000");
    private final UUID PROBLEM_UUID = UUID.fromString("555e5555-e55b-55d5-a555-555555555555");

    @BeforeEach
    void setUp() {
        tutorPrincipal = Mockito.mock(Principal.class);
        Mockito.when(tutorPrincipal.getName()).thenReturn(String.valueOf(TUTOR_UUID));
    }

    // --- CREATION (POST) ---

    @Test
    @DisplayName("[US05] POST should validate the DTO and forward the creation to the Service")
    void createProblem_WithValidTitle_ForwardsToService() throws Exception {
        ProblemRequest request = new ProblemRequest("Problem 1");

        Mockito.when(problemService.createProblem(eq(ROOM_UUID), any(ProblemRequest.class), eq(TUTOR_UUID)))
                .thenReturn(new ProblemResponse(PROBLEM_UUID, "Problem 1"));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/problems", ROOM_UUID)
                        .with(csrf())
                        .principal(tutorPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(PROBLEM_UUID.toString()))
                .andExpect(jsonPath("$.title").value("Problem 1"));

        // The deserialized body, the path variable and the authenticated user must all reach the Service
        verify(problemService, Mockito.times(1)).createProblem(
                eq(ROOM_UUID), argThat(r -> "Problem 1".equals(r.getTitle())), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US05] POST should return 400 and never call the Service when the title is blank")
    void createProblem_WithBlankTitle_Returns400() throws Exception {
        ProblemRequest request = new ProblemRequest("");

        mockMvc.perform(post("/api/v1/rooms/{roomId}/problems", ROOM_UUID)
                        .with(csrf())
                        .principal(tutorPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(problemService, never()).createProblem(any(), any(), any());
    }

    @Test
    @DisplayName("[US05] POST by a user who is not the room Tutor should return 403 Forbidden")
    void createProblem_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(String.valueOf(STUDENT_UUID));
        ProblemRequest request = new ProblemRequest("Intruder Problem");

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.when(problemService.createProblem(eq(ROOM_UUID), any(ProblemRequest.class), eq(STUDENT_UUID)))
                .thenThrow(new SecurityException("Only the room Tutor can manage its problems."));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/problems", ROOM_UUID)
                        .with(csrf())
                        .principal(studentPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(problemService, Mockito.times(1))
                .createProblem(eq(ROOM_UUID), any(ProblemRequest.class), eq(STUDENT_UUID));
    }

    // --- UPDATE (PUT) ---

    @Test
    @DisplayName("[US05] PUT should forward the title update to the Service and return 200")
    void updateProblem_WithValidTitle_ForwardsToService() throws Exception {
        ProblemRequest request = new ProblemRequest("Problem 1 - Revised");

        Mockito.when(problemService.updateProblem(eq(PROBLEM_UUID), any(ProblemRequest.class), eq(TUTOR_UUID)))
                .thenReturn(new ProblemResponse(PROBLEM_UUID, "Problem 1 - Revised"));

        mockMvc.perform(put("/api/v1/problems/{id}", PROBLEM_UUID)
                        .with(csrf())
                        .principal(tutorPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Problem 1 - Revised"));

        verify(problemService, Mockito.times(1)).updateProblem(
                eq(PROBLEM_UUID), argThat(r -> "Problem 1 - Revised".equals(r.getTitle())), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US05] PUT should return 400 and never call the Service when the title is blank")
    void updateProblem_WithBlankTitle_Returns400() throws Exception {
        ProblemRequest request = new ProblemRequest("");

        mockMvc.perform(put("/api/v1/problems/{id}", PROBLEM_UUID)
                        .with(csrf())
                        .principal(tutorPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(problemService, never()).updateProblem(any(), any(), any());
    }

    @Test
    @DisplayName("[US05] PUT by a user who is not the room Tutor should return 403 Forbidden")
    void updateProblem_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(String.valueOf(STUDENT_UUID));
        ProblemRequest request = new ProblemRequest("Hijacked Title");

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.when(problemService.updateProblem(eq(PROBLEM_UUID), any(ProblemRequest.class), eq(STUDENT_UUID)))
                .thenThrow(new SecurityException("Only the room Tutor can manage its problems."));

        mockMvc.perform(put("/api/v1/problems/{id}", PROBLEM_UUID)
                        .with(csrf())
                        .principal(studentPrincipal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(problemService, Mockito.times(1))
                .updateProblem(eq(PROBLEM_UUID), any(ProblemRequest.class), eq(STUDENT_UUID));
    }

    // --- DELETION (DELETE) ---

    @Test
    @DisplayName("[US05] DELETE should forward the deletion to the Service and return 204")
    void deleteProblem_WithValidId_ForwardsToService() throws Exception {
        mockMvc.perform(delete("/api/v1/problems/{id}", PROBLEM_UUID)
                        .with(csrf())
                        .principal(tutorPrincipal))
                .andExpect(status().isNoContent());

        verify(problemService, Mockito.times(1)).deleteProblem(eq(PROBLEM_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US05] DELETE by a user who is not the room Tutor should return 403 Forbidden")
    void deleteProblem_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(String.valueOf(STUDENT_UUID));

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.doThrow(new SecurityException("Only the room Tutor can manage its problems."))
                .when(problemService).deleteProblem(eq(PROBLEM_UUID), eq(STUDENT_UUID));

        mockMvc.perform(delete("/api/v1/problems/{id}", PROBLEM_UUID)
                        .with(csrf())
                        .principal(studentPrincipal))
                .andExpect(status().isForbidden());

        verify(problemService, Mockito.times(1)).deleteProblem(eq(PROBLEM_UUID), eq(STUDENT_UUID));
    }

    // --- LISTING (GET) ---

    @Test
    @DisplayName("[US05] GET should return the room problems preserving the chronological order")
    void listProblems_ReturnsProblemsInServiceOrder() throws Exception {
        UUID otherId = UUID.fromString("666e6666-e66b-66d6-a666-666666666666");
        Mockito.when(problemService.listProblems(ROOM_UUID))
                .thenReturn(List.of(
                        new ProblemResponse(PROBLEM_UUID, "Problem 1"),
                        new ProblemResponse(otherId, "Problem 2")));

        mockMvc.perform(get("/api/v1/rooms/{roomId}/problems", ROOM_UUID)
                        .principal(tutorPrincipal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Problem 1"))
                .andExpect(jsonPath("$[1].title").value("Problem 2"));

        verify(problemService, Mockito.times(1)).listProblems(eq(ROOM_UUID));
    }
}