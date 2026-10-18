package com.uefs.tfs.avaliasystem.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lançada quando o ID do problema informado não corresponde a nenhum registro.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ProblemNotFoundException extends RuntimeException {
    public ProblemNotFoundException(String message) {
        super(message);
    }
}