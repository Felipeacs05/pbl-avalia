package com.uefs.tfs.avaliasystem.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BehaviorRecordRequest {

    private UUID tagId;

    @Size(max = 500, message = "O texto deve ter no máximo 500 caracteres.")
    private String text;

    @JsonIgnore
    @AssertTrue(message = "Informe uma tag ou um texto.")
    public boolean isTagOrTextProvided() {
        return tagId != null || (text != null && !text.isBlank());
    }
}
