package com.uefs.tfs.avaliasystem.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lançada quando o ID de usuário fornecido não corresponde a nenhum registro.
 * Usada, por exemplo, ao tentar acessar o dashboard de um usuário inexistente.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(String message) {
        super(message);
    }
}