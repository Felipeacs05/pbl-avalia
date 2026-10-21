package com.uefs.tfs.avaliasystem.exception;

/** Já existe uma exportação em andamento para o mesmo tutor e sala (mapeada para 409). */
public class ExportInProgressException extends RuntimeException {
    public ExportInProgressException(String message) {
        super(message);
    }
}
