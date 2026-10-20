package com.uefs.tfs.avaliasystem.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lançada quando o ID da avaliação informado não corresponde a nenhum registro.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class AssessmentNotFoundException extends RuntimeException {
    public AssessmentNotFoundException(String message) {
        super(message);
    }
}