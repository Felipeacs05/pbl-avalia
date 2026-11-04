package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class RoomRequest {

    @NotBlank(message = "O nome da sala é obrigatório")
    @Size(min = 3, max = 100, message = "O nome deve ter entre 3 e 100 caracteres")
    private String name;

    private String description;

    public RoomRequest() {}

    public RoomRequest(String name) {
        this.name = name;
    }

    public RoomRequest(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
