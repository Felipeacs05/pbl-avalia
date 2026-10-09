package com.uefs.tfs.avaliasystem.US06;

import tools.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.controller.GroupController;
import com.uefs.tfs.avaliasystem.Security.RoomSecurity;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.dto.GroupResponse;
import com.uefs.tfs.avaliasystem.dto.GroupMemberResponse;
import com.uefs.tfs.avaliasystem.dto.GroupMemberRequest;
import com.uefs.tfs.avaliasystem.service.GroupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

// Web layer slice only (routes, JSON, validation, exception mapping); the Service is mocked
@WebMvcTest(GroupController.class)
@Import(SecurityConfig.class)
@TestConfig
class GroupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private GroupService groupService;

    @MockitoBean(name = "roomSecurity")
    private RoomSecurity roomSecurity;

    private Principal tutorPrincipal;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-49d9-a999-999999999999");
    private final UUID NEW_STUDENT_UUID = UUID.fromString("888e8888-e88b-48d8-a888-888888888888");
    private final UUID ROOM_UUID = UUID.fromString("987e6543-e21b-42d3-a456-426614174000");
    private final UUID GROUP_UUID = UUID.fromString("777e7777-e77b-47d7-a777-777777777777");

    @BeforeEach
    void setUp() {
        tutorPrincipal = Mockito.mock(Principal.class);
        Mockito.when(tutorPrincipal.getName()).thenReturn(TUTOR_UUID.toString());
        Mockito.when(roomSecurity.isOwner(any(UUID.class), any())).thenReturn(true);
    }

    // --- CREATION (POST) ---

    @Test
    @DisplayName("[US06] POST should validate the DTO and forward the creation to the Service")
    void createGroup_WithValidName_ForwardsToService() throws Exception {
        GroupRequest request = new GroupRequest("Group 1");

        Mockito.when(groupService.createGroup(eq(ROOM_UUID), any(GroupRequest.class), eq(TUTOR_UUID)))
               .thenReturn(new GroupResponse(GROUP_UUID, "Group 1", List.of()));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups", ROOM_UUID)
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(GROUP_UUID.toString()))
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
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(groupService, never()).createGroup(any(), any(), any());
    }

    @Test
    @DisplayName("[US06] POST by a user who is not the room Tutor should return 403 Forbidden")
    void createGroup_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID.toString());
        GroupRequest request = new GroupRequest("Intruder Group");

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.when(groupService.createGroup(eq(ROOM_UUID), any(GroupRequest.class), eq(STUDENT_UUID)))
               .thenThrow(new SecurityException("Only the room Tutor can manage its groups."));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups", ROOM_UUID)
                .with(jwt().jwt(j -> j.subject(STUDENT_UUID.toString())))
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

        Mockito.when(groupService.updateGroup(eq(ROOM_UUID), eq(GROUP_UUID), any(GroupRequest.class), eq(TUTOR_UUID)))
               .thenReturn(new GroupResponse(GROUP_UUID, "Group 1 - Renamed",
                       List.of(new GroupMemberResponse("Student A", STUDENT_UUID))));

        mockMvc.perform(patch("/api/v1/rooms/{roomId}/groups/{groupId}", ROOM_UUID, GROUP_UUID)
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(GROUP_UUID.toString()))
                .andExpect(jsonPath("$.name").value("Group 1 - Renamed"))
                .andExpect(jsonPath("$.members[0].id").value(STUDENT_UUID.toString()));

        verify(groupService, Mockito.times(1)).updateGroup(
                eq(ROOM_UUID), eq(GROUP_UUID), argThat(r -> "Group 1 - Renamed".equals(r.getName())), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] PUT should return 400 and never call the Service when the name is blank")
    void updateGroup_WithBlankName_Returns400() throws Exception {
        GroupRequest request = new GroupRequest("");

        mockMvc.perform(patch("/api/v1/rooms/{roomId}/groups/{groupId}", ROOM_UUID, GROUP_UUID)
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(groupService, never()).updateGroup(any(), any(), any(), any());
    }

    @Test
    @DisplayName("[US06] PUT by a user who is not the room Tutor should return 403 Forbidden")
    void updateGroup_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID.toString());
        GroupRequest request = new GroupRequest("Hijacked Name");

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.when(groupService.updateGroup(eq(ROOM_UUID), eq(GROUP_UUID), any(GroupRequest.class), eq(STUDENT_UUID)))
               .thenThrow(new SecurityException("Only the room Tutor can manage its groups."));

        mockMvc.perform(patch("/api/v1/rooms/{roomId}/groups/{groupId}", ROOM_UUID, GROUP_UUID)
                .with(jwt().jwt(j -> j.subject(STUDENT_UUID.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1))
                .updateGroup(eq(ROOM_UUID), eq(GROUP_UUID), any(GroupRequest.class), eq(STUDENT_UUID));
    }

    // --- DELETION (DELETE) ---

    @Test
    @DisplayName("[US06] DELETE should forward the deletion to the Service and return 204")
    void deleteGroup_WithValidId_ForwardsToService() throws Exception {
        mockMvc.perform(delete("/api/v1/rooms/{roomId}/groups/{groupId}", ROOM_UUID, GROUP_UUID)
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString()))))
                .andExpect(status().isNoContent());

        verify(groupService, Mockito.times(1)).deleteGroup(eq(ROOM_UUID), eq(GROUP_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] DELETE by a user who is not the room Tutor should return 403 Forbidden")
    void deleteGroup_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID.toString());

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.doThrow(new SecurityException("Only the room Tutor can manage its groups."))
               .when(groupService).deleteGroup(eq(ROOM_UUID), eq(GROUP_UUID), eq(STUDENT_UUID));

        mockMvc.perform(delete("/api/v1/rooms/{roomId}/groups/{groupId}", ROOM_UUID, GROUP_UUID)
                .with(jwt().jwt(j -> j.subject(STUDENT_UUID.toString()))))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1)).deleteGroup(eq(ROOM_UUID), eq(GROUP_UUID), eq(STUDENT_UUID));
    }

    // --- ADDING A STUDENT (POST) ---

    @Test
    @DisplayName("[US06] POST member should forward the student to the Service and return the updated group")
    void addMember_WithValidStudent_ForwardsToService() throws Exception {
        Mockito.when(groupService.addMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(TUTOR_UUID)))
               .thenReturn(new GroupResponse(GROUP_UUID, "Group 1", List.of(
                       new GroupMemberResponse("Student A", STUDENT_UUID),
                       new GroupMemberResponse("Student B", NEW_STUDENT_UUID))));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups/{groupId}/members", ROOM_UUID, GROUP_UUID)
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new GroupMemberRequest(NEW_STUDENT_UUID))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(GROUP_UUID.toString()))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[1].id").value(NEW_STUDENT_UUID.toString()))
                .andExpect(jsonPath("$.members[1].name").value("Student B"));

        // Both path variables and the authenticated user must reach the Service
        verify(groupService, Mockito.times(1)).addMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] POST member with a student not enrolled in the room should return 400 Bad Request")
    void addMember_WithStudentNotLinkedToRoom_Returns400() throws Exception {
        // The Service owns the integrity rule; this test checks the IllegalArgumentException -> 400 mapping
        Mockito.when(groupService.addMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(TUTOR_UUID)))
               .thenThrow(new IllegalArgumentException("Student is not linked to this room."));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups/{groupId}/members", ROOM_UUID, GROUP_UUID)
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new GroupMemberRequest(NEW_STUDENT_UUID))))
                .andExpect(status().isBadRequest());

        verify(groupService, Mockito.times(1)).addMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] POST member by a user who is not the room Tutor should return 403 Forbidden")
    void addMember_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID.toString());

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.when(groupService.addMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(STUDENT_UUID)))
               .thenThrow(new SecurityException("Only the room Tutor can manage its groups."));

        mockMvc.perform(post("/api/v1/rooms/{roomId}/groups/{groupId}/members", ROOM_UUID, GROUP_UUID)
                .with(jwt().jwt(j -> j.subject(STUDENT_UUID.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new GroupMemberRequest(NEW_STUDENT_UUID))))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1)).addMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(STUDENT_UUID));
    }

    // --- REMOVING A STUDENT (DELETE) ---

    @Test
    @DisplayName("[US06] DELETE member should forward the removal to the Service and return 204")
    void removeMember_WithValidStudent_ForwardsToService() throws Exception {
        mockMvc.perform(delete("/api/v1/rooms/{roomId}/groups/{groupId}/members/{studentId}", ROOM_UUID, GROUP_UUID, STUDENT_UUID)
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString()))))
                .andExpect(status().isNoContent());

        verify(groupService, Mockito.times(1)).removeMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(STUDENT_UUID), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("[US06] DELETE member by a user who is not the room Tutor should return 403 Forbidden")
    void removeMember_ByNonTutor_Returns403() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID.toString());

        // The Service owns the ownership rule; this test checks the SecurityException -> 403 mapping
        Mockito.doThrow(new SecurityException("Only the room Tutor can manage its groups."))
               .when(groupService).removeMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(STUDENT_UUID));

        mockMvc.perform(delete("/api/v1/rooms/{roomId}/groups/{groupId}/members/{studentId}", ROOM_UUID, GROUP_UUID, NEW_STUDENT_UUID)
                .with(jwt().jwt(j -> j.subject(STUDENT_UUID.toString()))))
                .andExpect(status().isForbidden());

        verify(groupService, Mockito.times(1)).removeMember(eq(ROOM_UUID), eq(GROUP_UUID), eq(NEW_STUDENT_UUID), eq(STUDENT_UUID));
    }

    // --- AVAILABLE STUDENTS (GET) ---

    @Test
    @DisplayName("[US06] GET available students should return the students provided by the Service")
    void listAvailableStudents_ReturnsServiceStudents() throws Exception {
        Mockito.when(groupService.listAvailableStudents(ROOM_UUID))
               .thenReturn(List.of(new GroupMemberResponse("Student B", NEW_STUDENT_UUID)));

        mockMvc.perform(get("/api/v1/rooms/{roomId}/groups/available-students", ROOM_UUID)
                .with(jwt().jwt(j -> j.subject(TUTOR_UUID.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(NEW_STUDENT_UUID.toString()))
                .andExpect(jsonPath("$[0].name").value("Student B"));

        verify(groupService, Mockito.times(1)).listAvailableStudents(eq(ROOM_UUID));
    }

    // --- STUDENT VIEW (GET) ---

    @Test
    @DisplayName("[US06] GET my group should return the authenticated student group with its members")
    void getMyGroup_ReturnsAuthenticatedStudentGroup() throws Exception {
        Principal studentPrincipal = Mockito.mock(Principal.class);
        Mockito.when(studentPrincipal.getName()).thenReturn(STUDENT_UUID.toString());

        Mockito.when(groupService.getMyGroup(ROOM_UUID, STUDENT_UUID))
               .thenReturn(new GroupResponse(GROUP_UUID, "Group 1", List.of(
                       new GroupMemberResponse("Student A", STUDENT_UUID),
                       new GroupMemberResponse("Student B", NEW_STUDENT_UUID))));

        mockMvc.perform(get("/api/v1/rooms/{roomId}/groups/me", ROOM_UUID)
                .with(jwt().jwt(j -> j.subject(STUDENT_UUID.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(GROUP_UUID.toString()))
                .andExpect(jsonPath("$.name").value("Group 1"))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.members[0].name").value("Student A"))
                .andExpect(jsonPath("$.members[1].name").value("Student B"));

        // The student is identified by the authenticated Principal, never by a request parameter
        verify(groupService, Mockito.times(1)).getMyGroup(eq(ROOM_UUID), eq(STUDENT_UUID));
    }
}
