package com.uefs.tfs.avaliasystem.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    //esse global exception handler captura todos os erros do controller, assim a gnt n tem q ficar colocando 2000 try catchs nos controllers

    //esse aq captura todos os credenciais invalidas Exception(pro login)
    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleCredenciaisInvalidas(
            InvalidCredentialsException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(
                        "message",
                        "Credenciais inválidas"
                ));
    }


    // e esse todos os cadastroInvalidoException( pro cadastro, em caso de alguem enviar algum dado incorreto )
    @ExceptionHandler(InvalidRegisterException.class)
    public ResponseEntity<Map<String, String>> handleInvalidRegister(
            InvalidRegisterException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "message",
                        "Não foi possível concluir o cadastro"
                ));
    }

    //e esse capturaria o erros na foto(tipo ou tamanho)
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleInvalidArgument(
            IllegalArgumentException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "message",
                        exception.getMessage()
                ));
    }
}
