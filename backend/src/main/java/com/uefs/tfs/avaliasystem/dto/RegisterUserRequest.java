package com.uefs.tfs.avaliasystem.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegisterUserRequest {

    @NotBlank(message = "Name is required")
    @Pattern(regexp = "^[^<>]*$", message = "Name contains invalid characters")
    @JsonAlias("nome")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @JsonAlias("senha")
    private String password;

    @JsonAlias("fotoUrl")
    private String profilePictureUrl;

    public RegisterUserRequest(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }

    // Compatibility getters/setters
    public String getNome() {
        return name;
    }

    public void setNome(String nome) {
        this.name = nome;
    }

    public String getSenha() {
        return password;
    }

    public void setSenha(String senha) {
        this.password = senha;
    }

    public String getFotoUrl() {
        return profilePictureUrl;
    }

    public void setFotoUrl(String fotoUrl) {
        this.profilePictureUrl = fotoUrl;
    }
}