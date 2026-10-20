package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.User;

import java.util.Locale;
import java.util.UUID;

/**
 * DTO do carômetro da turma (US18).
 * O campo "initials" é sempre preenchido para o frontend montar o avatar de fallback
 * caso a imagem (lazy loading) falhe ao carregar.
 */
public record ClassRosterDTO(
        UUID id,
        String name,
        String profileImageUrl,
        String initials
) {
    public static final String FALLBACK_INITIALS = "?";

    public static ClassRosterDTO from(User user) {
        return new ClassRosterDTO(
                user.getId(),
                user.getName(),
                user.getProfilePictureUrl(),
                buildInitials(user.getName())
        );
    }

    /** Primeira letra do primeiro nome + primeira letra do último nome, em maiúsculas. */
    public static String buildInitials(String name) {
        if (name == null || name.isBlank()) {
            return FALLBACK_INITIALS;
        }
        String[] parts = name.trim().split("\\s+");
        String first = parts[0].substring(0, 1);
        String initials = parts.length > 1 ? first + parts[parts.length - 1].substring(0, 1) : first;
        return initials.toUpperCase(Locale.ROOT);
    }
}