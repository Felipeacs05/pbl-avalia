package com.uefs.tfs.avaliasystem.model;

import java.util.Arrays;
import java.util.stream.Collectors;

/** Formatos de exportação suportados (US19). */
public enum ExportFormat {
    PDF("pdf", "application/pdf"),
    XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final String extension;
    private final String contentType;

    ExportFormat(String extension, String contentType) {
        this.extension = extension;
        this.contentType = contentType;
    }

    public String extension() { return extension; }

    public String contentType() { return contentType; }

    /** Aceita o valor sem diferenciar maiúsculas/minúsculas; qualquer outro vira IllegalArgumentException (400). */
    public static ExportFormat from(String value) {
        if (value != null) {
            for (ExportFormat format : values()) {
                if (format.name().equalsIgnoreCase(value.trim())) {
                    return format;
                }
            }
        }
        String accepted = Arrays.stream(values()).map(Enum::name).collect(Collectors.joining(", "));
        throw new IllegalArgumentException("Formato de exportação não suportado. Formatos aceitos: " + accepted);
    }
}
