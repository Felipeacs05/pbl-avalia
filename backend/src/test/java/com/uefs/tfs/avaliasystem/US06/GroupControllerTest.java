package com.uefs.tfs.avaliasystem.US06;

import tools.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.controller.GroupController;
import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.dto.GroupResponse;
import com.uefs.tfs.avaliasystem.dto.StudentResponse;
import com.uefs.tfs.avaliasystem.service.GroupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Web layer slice only (routes, JSON, validation, exception mapping); the Service is mocked
@WebMvcTest(GroupController.class)
class GroupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private GroupService groupService;

    private Principal tutorPrincipal;

    private final String TUTOR_UUID = "123e4567-e89b-12d3-a456-426614174000";
    private final String STUDENT_UUID = "999e9999-e99b-99d9-a999-999999999999";
    private final String NEW_STUDENT_UUID = "888e8888-e88b-88d8-a888-888888888888";
    private final String ROOM_UUID = "987e6543-e21b-12d3-a456-426614174000";
    private final String GROUP_UUID = "777e7777-e77b-77d7-a777-777777777777";

    @BeforeEach
    void setUp() {
        tutorPrincipal = Mockito.mock(Principal.class);
        Mockito.when(tutorPrincipal.getName()).thenReturn(TUTOR_UUID);
    }

    // --- CREATION (POST) ---

    @Test
    @DisplayName("[US06] POST should validate the DTO and forward the creation to the Service")
    void createGroup_WithValidName_ForwardsToService() throws Exception {
        GroupRequest request = new GroupRequest("Group 1");

        Mockito.when(groupService.createGroup(eq(ROOM_UUID), any(GroupRequest.class), eq(TUTOR_UUID)))
               .thenReturn(new GroupResponse(GROUP_UUID, "Group 1", List.of()));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups", ROOM_UUID)
                .principal(tutorPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(GROUP_UUID))
                .andExpect(jsonPath("$.name").value("Group 1"))
                .andExpect(jsonPath("$.members.length()").value(0));

        // The deserialized body, the path variable and the authenticated user must all reach the Service
        verify(groupService, Mockito.times(1)).createGroup(
                eq(ROOM_UUID), argThat(r -> "Group 1".equals(r.getName())), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] POST should return 400 and never call the Service when the name is blank")
    void createGroup_WithBlankName_Returns400() throws Exception {
        GroupRequest request = new GroupRequest("");

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups", ROOM_UUID)
                .principal(tutorPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(groupService, never()).createGroup(any(), any(), any());
    }

    @Test
    @DisplayName("[US06] POST by a user who is not the room Tutor should return 403 Forbidden")
    void createGroup_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID);
        GroupRequest request = new GroupRequest("Intruder Group");

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.when(groupService.createGroup(eq(ROOM_UUID), any(GroupRequest.class), eq(STUDENT_UUID)))
               .thenThrow(new SecurityException("Only the room Tutor can manage its groups."));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups", ROOM_UUID)
                .principal(studentPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1))
                .createGroup(eq(ROOM_UUID), any(GroupRequest.class), eq(STUDENT_UUID));
    }

    // --- UPDATE (PUT) ---

    @Test
    @DisplayName("[US06] PUT should forward the rename to the Service and return 200")
    void updateGroup_WithValidName_ForwardsToService() throws Exception {
        GroupRequest request = new GroupRequest("Group 1 - Renamed");

        Mockito.when(groupService.updateGroup(eq(GROUP_UUID), any(GroupRequest.class), eq(TUTOR_UUID)))
               .thenReturn(new GroupResponse(GROUP_UUID, "Group 1 - Renamed",
                       List.of(new StudentResponse(STUDENT_UUID, "Student A"))));

        mockMvc.perform(put("/api/v1/groups/{id}", GROUP_UUID)
                .principal(tutorPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(GROUP_UUID))
                .andExpect(jsonPath("$.name").value("Group 1 - Renamed"))
                .andExpect(jsonPath("$.members[0].id").value(STUDENT_UUID));

        verify(groupService, Mockito.times(1)).updateGroup(
                eq(GROUP_UUID), argThat(r -> "Group 1 - Renamed".equals(r.getName())), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] PUT should return 400 and never call the Service when the name is blank")
    void updateGroup_WithBlankName_Returns400() throws Exception {
        GroupRequest request = new GroupRequest("");

        mockMvc.perform(put("/api/v1/groups/{id}", GROUP_UUID)
                .principal(tutorPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(groupService, never()).updateGroup(any(), any(), any());
    }

    @Test
    @DisplayName("[US06] PUT by a user who is not the room Tutor should return 403 Forbidden")
    void updateGroup_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID);
        GroupRequest request = new GroupRequest("Hijacked Name");

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.when(groupService.updateGroup(eq(GROUP_UUID), any(GroupRequest.class), eq(STUDENT_UUID)))
               .thenThrow(new SecurityException("Only the room Tutor can manage its groups."));

        mockMvc.perform(put("/api/v1/groups/{id}", GROUP_UUID)
                .principal(studentPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1))
                .updateGroup(eq(GROUP_UUID), any(GroupRequest.class), eq(STUDENT_UUID));
    }

    // --- DELETION (DELETE) ---

    @Test
    @DisplayName("[US06] DELETE should forward the deletion to the Service and return 204")
    void deleteGroup_WithValidId_ForwardsToService() throws Exception {
        mockMvc.perform(delete("/api/v1/groups/{id}", GROUP_UUID)
                .principal(tutorPrincipal))
                .andExpect(status().isNoContent());

        verify(groupService, Mockito.times(1)).deleteGroup(eq(GROUP_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] DELETE by a user who is not the room Tutor should return 403 Forbidden")
    void deleteGroup_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID);

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.doThrow(new SecurityException("Only the room Tutor can manage its groups."))
               .when(groupService).deleteGroup(eq(GROUP_UUID), eq(STUDENT_UUID));

        mockMvc.perform(delete("/api/v1/groups/{id}", GROUP_UUID)
                .principal(studentPrincipal))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1)).deleteGroup(eq(GROUP_UUID), eq(STUDENT_UUID));
    }

    // --- ADDING A STUDENT (POST) ---

    @Test
    @DisplayName("[US06] POST member should forward the student to the Service and return the updated group")
    void addMember_WithValidStudent_ForwardsToService() throws Exception {
        Mockito.when(groupService.addMember(eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(TUTOR_UUID)))
               .thenReturn(new GroupResponse(GROUP_UUID, "Group 1", List.of(
                       new StudentResponse(STUDENT_UUID, "Student A"),
                       new StudentResponse(NEW_STUDENT_UUID, "Student B"))));

        mockMvc.perform(post("/api/v1/groups/{id}/members/{studentId}", GROUP_UUID, NEW_STUDENT_UUID)
                .principal(tutorPrincipal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(GROUP_UUID))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[1].id").value(NEW_STUDENT_UUID))
                .andExpect(jsonPath("$.members[1].name").value("Student B"));

        // Both path variables and the authenticated user must reach the Service
        verify(groupService, Mockito.times(1)).addMember(eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] POST member with a student not enrolled in the room should return 400 Bad Request")
    void addMember_WithStudentNotLinkedToRoom_Returns400() throws Exception {
        // The Service owns the integrity rule; this test checks the IllegalArgumentException -> 400 mapping
        Mockito.when(groupService.addMember(eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(TUTOR_UUID)))
               .thenThrow(new IllegalArgumentException("Student is not linked to this room."));

        mockMvc.perform(post("/api/v1/groups/{id}/members/{studentId}", GROUP_UUID, NEW_STUDENT_UUID)
                .principal(tutorPrincipal))
                .andExpect(status().isBadRequest());

        verify(groupService, Mockito.times(1)).addMember(eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] POST member by a user who is not the room Tutor should return 403 Forbidden")
    void addMember_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID);

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.when(groupService.addMember(eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(STUDENT_UUID)))
               .thenThrow(new SecurityException("Only the room Tutor can manage its groups."));

        mockMvc.perform(post("/api/v1/groups/{id}/members/{studentId}", GROUP_UUID, NEW_STUDENT_UUID)
                .principal(studentPrincipal))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1)).addMember(eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(STUDENT_UUID));
    }

    // --- REMOVING A STUDENT (DELETE) ---

    @Test
    @DisplayName("[US06] DELETE member should forward the removal to the Service and return 204")
    void removeMember_WithValidStudent_ForwardsToService() throws Exception {
        mockMvc.perform(delete("/api/v1/groups/{id}/members/{studentId}", GROUP_UUID, STUDENT_UUID)
                .principal(tutorPrincipal))
                .andExpect(status().isNoContent());

        verify(groupService, Mockito.times(1)).removeMember(eq(GROUP_UUID), eq(STUDENT_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] DELETE member by a user who is not the room Tutor should return 403 Forbidden")
    void removeMember_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID);

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.doThrow(new SecurityException("Only the room Tutor can manage its groups."))
               .when(groupService).removeMember(eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(STUDENT_UUID));

        mockMvc.perform(delete("/api/v1/groups/{id}/members/{studentId}", GROUP_UUID, NEW_STUDENT_UUID)
                .principal(studentPrincipal))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1)).removeMember(eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(STUDENT_UUID));
    }

    // --- AVAILABLE STUDENTS (GET) ---

    @Test
    @DisplayName("[US06] GET available students should return the students provided by the Service")
    void listAvailableStudents_ReturnsServiceStudents() throws Exception {
        Mockito.when(groupService.listAvailableStudents(ROOM_UUID))
               .thenReturn(List.of(new StudentResponse(NEW_STUDENT_UUID, "Student B")));

        mockMvc.perform(get("/api/v1/rooms/{roomId}/groups/available-students", ROOM_UUID)
                .principal(tutorPrincipal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(NEW_STUDENT_UUID))
                .andExpect(jsonPath("$[0].name").value("Student B"));

        verify(groupService, Mockito.times(1)).listAvailableStudents(eq(ROOM_UUID));
    }

    // --- STUDENT VIEW (GET) ---

    @Test
    @DisplayName("[US06] GET my group should return the authenticated student group with its members")
    void getMyGroup_ReturnsAuthenticatedStudentGroup() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID);

        Mockito.when(groupService.getMyGroup(ROOM_UUID, STUDENT_UUID))
               .thenReturn(new GroupResponse(GROUP_UUID, "Group 1", List.of(
                       new StudentResponse(STUDENT_UUID, "Student A"),
                       new StudentResponse(NEW_STUDENT_UUID, "Student B"))));

        mockMvc.perform(get("/api/v1/rooms/{roomId}/groups/me", ROOM_UUID)
                .principal(studentPrincipal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(GROUP_UUID))
                .andExpect(jsonPath("$.name").value("Group 1"))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[0].name").value("Student A"))
                .andExpect(jsonPath("$.members[1].name").value("Student B"));

        // The student is identified by the authenticated Principal, never by a request parameter
        verify(groupService, Mockito.times(1)).getMyGroup(eq(ROOM_UUID), eq(STUDENT_UUID));
    }
}
