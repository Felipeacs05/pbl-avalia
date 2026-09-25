package com.uefs.tfs.avaliasystem.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO de requisição de login (US02).
 * Recebe e-mail e senha em texto puro — a senha é verificada pelo serviço
 * contra o hash BCrypt armazenado no banco.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    private String email;
    private String password;
}
