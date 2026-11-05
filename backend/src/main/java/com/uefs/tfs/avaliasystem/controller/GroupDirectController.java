package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.GroupMemberRequest;
import com.uefs.tfs.avaliasystem.dto.GroupResponse;
import com.uefs.tfs.avaliasystem.dto.GroupRequest;
import com.uefs.tfs.avaliasystem.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupDirectController {

    private final GroupService groupService;

    public GroupDirectController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PutMapping("/{groupId}")
    @ResponseStatus(HttpStatus.OK)
    public GroupResponse updateGroupPut(
            @PathVariable UUID groupId,
            @RequestBody @Valid GroupRequest request,
            Principal principal
    ) {
        return groupService.updateGroupDirect(groupId, request, userId(principal));
    }

    @PatchMapping("/{groupId}")
    @ResponseStatus(HttpStatus.OK)
    public GroupResponse updateGroupPatch(
            @PathVariable UUID groupId,
            @RequestBody @Valid GroupRequest request,
            Principal principal
    ) {
        return groupService.updateGroupDirect(groupId, request, userId(principal));
    }

    @DeleteMapping("/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(
            @PathVariable UUID groupId,
            Principal principal
    ) {
        groupService.deleteGroupDirect(groupId, userId(principal));
    }

    @PostMapping("/{groupId}/members")
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse addMember(
            @PathVariable UUID groupId,
            @RequestBody @Valid GroupMemberRequest request,
            Principal principal
    ) {
        return groupService.addMemberDirect(groupId, request.getStudentId(), userId(principal));
    }

    @DeleteMapping("/{groupId}/members/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(
            @PathVariable UUID groupId,
            @PathVariable UUID studentId,
            Principal principal
    ) {
        groupService.removeMemberDirect(groupId, studentId, userId(principal));
    }

    private UUID userId(Principal principal) {
        return UUID.fromString(principal.getName());
    }
}

