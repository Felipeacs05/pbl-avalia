package com.uefs.tfs.avaliasystem.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import org.springframework.security.oauth2.jwt.Jwt;

/*
 * DTO de resposta ao login bem-sucedido (US02).
 * Retorna apenas o token JWT e o instante de expiração (epoch-millis),
 * nunca dados sensíveis como senha ou hash.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    /** Token JWT assinado. */
    private String token;

    private long expiresAt;


    /**
     * Instante de expiração do token em milissegundos desde a epoch Unix.
     * O cliente deve renovar a sessão antes deste momento.
     * Ex.: System.currentTimeMillis() + 24 * 60 * 60 * 1000L (24 horas).
     */
}
