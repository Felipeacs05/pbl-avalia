package com.uefs.tfs.avaliasystem.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.uefs.tfs.avaliasystem.model.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;

    @JsonProperty("name")
    @JsonAlias("nome")
    private String name;

    private String email;

    @JsonProperty("profilePictureUrl")
    @JsonAlias({"fotoPerfilUrl", "fotoUrl"})
    private String profilePictureUrl;

    public static UserResponse fromUser(User user) {
        if (user == null) {
            return null;
        }
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getProfilePictureUrl()
        );
    }

    // Compatibility getters and setters
    public String getNome() {
        return name;
    }

    public void setNome(String nome) {
        this.name = nome;
    }

    public String getFotoPerfilUrl() {
        return profilePictureUrl;
    }

    public void setFotoPerfilUrl(String fotoPerfilUrl) {
        this.profilePictureUrl = fotoPerfilUrl;
    }
}