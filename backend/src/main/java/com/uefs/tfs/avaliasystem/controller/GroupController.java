package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.dto.GroupResponse;
import com.uefs.tfs.avaliasystem.dto.GroupMemberRequest;
import com.uefs.tfs.avaliasystem.dto.GroupMemberResponse;
import com.uefs.tfs.avaliasystem.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping("/{roomId}/groups")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public GroupResponse createGroup(
            @PathVariable UUID roomId,
            @RequestBody @Valid GroupRequest request,
            Principal principal
    ) {
        return groupService.createGroup(roomId, request, userId(principal));
    }

    @GetMapping("/{roomId}/groups")
    @PreAuthorize("@roomSecurity.isRoomMemberOrOwner(#roomId, authentication)")
    public List<GroupResponse> listGroups(@PathVariable UUID roomId) {
        return groupService.listGroups(roomId);
    }

    @PatchMapping("/{roomId}/groups/{groupId}")
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public GroupResponse updateGroup(
            @PathVariable UUID roomId,
            @PathVariable UUID groupId,
            @RequestBody @Valid GroupRequest request,
            Principal principal
    ) {
        return groupService.updateGroup(roomId, groupId, request, userId(principal));
    }

    @DeleteMapping("/{roomId}/groups/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public void deleteGroup(
            @PathVariable UUID roomId,
            @PathVariable UUID groupId,
            Principal principal
    ) {
        groupService.deleteGroup(roomId, groupId, userId(principal));
    }

    @PostMapping("/{roomId}/groups/{groupId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public GroupResponse addMember(
            @PathVariable UUID roomId,
            @PathVariable UUID groupId,
            @RequestBody @Valid GroupMemberRequest request,
            Principal principal
    ) {
        return groupService.addMember(
                roomId,
                groupId,
                request.getStudentId(),
                userId(principal)
        );
    }

    @DeleteMapping("/{roomId}/groups/{groupId}/members/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public void removeMember(
            @PathVariable UUID roomId,
            @PathVariable UUID groupId,
            @PathVariable UUID studentId,
            Principal principal
    ) {
        groupService.removeMember(roomId, groupId, studentId, userId(principal));
    }

    @GetMapping("/{roomId}/groups/me")
    public GroupResponse getMyGroup(
            @PathVariable UUID roomId,
            Principal principal
    ) {
        return groupService.getMyGroup(roomId, userId(principal));
    }

    @GetMapping("/{roomId}/groups/available-students")
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public List<GroupMemberResponse> listAvailableStudents(@PathVariable UUID roomId) {
        return groupService.listAvailableStudents(roomId);
    }

    private UUID userId(Principal principal) {
        return UUID.fromString(principal.getName());
    }
}
