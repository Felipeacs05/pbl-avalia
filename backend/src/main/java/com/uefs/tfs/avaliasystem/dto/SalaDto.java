package com.uefs.tfs.avaliasystem.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * DTO que representa uma Sala no dashboard (US02).
 * Contém apenas os dados exibíveis ao usuário — id, nome e código de acesso.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SalaDto {
    private Long id;
    private String nome;
    /** Código curto usado por alunos para entrar na sala. */
    private String codigoAcesso;
}
