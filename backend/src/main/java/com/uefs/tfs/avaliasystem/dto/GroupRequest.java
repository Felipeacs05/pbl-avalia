package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class GroupRequest {


    //faz com q retorne bad request e evita validação manual vvv
    @Setter
    @NotBlank(message = "O nome do grupo é obrigatório")
    @Size(min = 3, max = 100, message = "O nome do grupo deve ter entre 3 e 100 caracteres")
    private String name;

    private List<@NotNull(message = "O identificador do aluno não pode ser nulo") UUID> memberIds = new ArrayList<>();

    public GroupRequest() {}

    public GroupRequest(String name) {
        this.name = name;
    }

    public GroupRequest(String name, List<UUID> memberIds) {
        this.name = name;
        setMemberIds(memberIds);
    }

    public String getName() {
        return name;
    }

    public List<UUID> getMemberIds() {
        return memberIds;
    }

    public void setMemberIds(List<UUID> memberIds) {
        this.memberIds = memberIds == null ? new ArrayList<>() : new ArrayList<>(memberIds);
    }
}
