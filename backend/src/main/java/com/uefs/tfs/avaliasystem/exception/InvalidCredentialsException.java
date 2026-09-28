package com.uefs.tfs.avaliasystem.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lançada quando e-mail ou senha não correspondem a nenhum usuário válido.
 *
 * A mensagem é intencionalmente genérica ("Credenciais inválidas") para não
 * revelar se o e-mail existe ou não no banco — critério de segurança da US02.
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}