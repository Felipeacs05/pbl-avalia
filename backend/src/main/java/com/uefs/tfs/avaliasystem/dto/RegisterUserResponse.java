package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.User;

import java.util.UUID;

public record RegisterUserResponse(
        UUID id,
        String name,
        String email,
        String profilePictureUrl
) {
    public static RegisterUserResponse from(User user) {
        return new RegisterUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getProfilePictureUrl()
        );
    }
}
