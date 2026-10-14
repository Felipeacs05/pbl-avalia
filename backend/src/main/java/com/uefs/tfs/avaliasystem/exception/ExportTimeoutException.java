package com.uefs.tfs.avaliasystem.exception;

/** A geração do arquivo excedeu o tempo limite configurado (mapeada para 504). */
public class ExportTimeoutException extends RuntimeException {
    public ExportTimeoutException(String message) {
        super(message);
    }
}
