package com.uefs.tfs.avaliasystem.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Room DTO (US02).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomDto {
    private Long id;

    @JsonAlias("name")
    private String nome;

    /** Short code used by students to join the room. */
    @JsonAlias("accessCode")
    private String codigoAcesso;

    public String getName() {
        return nome;
    }

    public void setName(String name) {
        this.nome = name;
    }

    public String getAccessCode() {
        return codigoAcesso;
    }

    public void setAccessCode(String accessCode) {
        this.codigoAcesso = accessCode;
    }
}