package com.uefs.tfs.avaliasystem.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CadastroUsuarioRequest {
    private String nome;
    private String email;
    private String senha;
}
