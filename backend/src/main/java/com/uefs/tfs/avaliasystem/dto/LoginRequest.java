package com.uefs.tfs.avaliasystem.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Login request DTO (US02).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    private String email;

    @JsonAlias("password")
    private String senha;

    public String getPassword() {
        return senha;
    }

    public void setPassword(String password) {
        this.senha = password;
    }
}