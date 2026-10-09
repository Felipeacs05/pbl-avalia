package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Role;

import java.util.UUID;

public record RoomMemberResponse(
        UUID id,
        String name,
        Role role
) {
}
