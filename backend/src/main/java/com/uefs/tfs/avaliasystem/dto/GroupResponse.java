package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Group;

import java.util.List;
import java.util.UUID;

public class GroupResponse {

    private UUID id;
    private String name;
    private UUID roomId;
    private List<GroupMemberResponse> members;

    public GroupResponse() {}

    public GroupResponse(UUID id, String name, UUID roomId, List<GroupMemberResponse> members) {
        this.id = id;
        this.name = name;
        this.roomId = roomId;
        this.members = members;
    }

    public GroupResponse(UUID id, String name, List<GroupMemberResponse> members) {
        this(id, name, null, members);
    }

    public GroupResponse(Group group) {
        this.id = group.getId();
        this.name = group.getName();
        this.roomId = group.getRoom().getId();
        this.members = group.getMembers().stream()
                .map(member -> new GroupMemberResponse(
                        member.getUser().getName(),
                        member.getUser().getId()
                ))
                .toList();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public UUID getRoomId() {
        return roomId;
    }

    public void setRoomId(UUID roomId) {
        this.roomId = roomId;
    }

    public List<GroupMemberResponse> getMembers() {
        return members;
    }

    public void setMembers(List<GroupMemberResponse> members) {
        this.members = members;
    }
}
