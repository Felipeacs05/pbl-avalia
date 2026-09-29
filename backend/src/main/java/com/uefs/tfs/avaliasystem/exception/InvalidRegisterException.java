package com.uefs.tfs.avaliasystem.exception;


import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(value = HttpStatus.BAD_REQUEST)
public class InvalidRegisterException extends RuntimeException {
    public InvalidRegisterException(String message) {
        super(message);
    }


    public InvalidRegisterException() {
        super("Cadastro Inválido");
    }
}
