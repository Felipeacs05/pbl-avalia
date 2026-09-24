package com.uefs.tfs.avaliasystem.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO de resposta do dashboard do usuário (US02).
 *
 * Separação visual/lógica entre os dois papéis:
 *   • salasComoTutor  — salas criadas pelo usuário (ele é administrador/Tutor).
 *   • salasComoAluno  — salas em que o usuário entrou via código (ele é Aluno).
 *
 * Ambas as listas são sempre inicializadas (nunca null) para facilitar
 * a renderização da UI sem verificações extras.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    /** Aba "Salas que administro (Tutor)". */
    private List<SalaDto> salasComoTutor;

    /** Aba "Salas que participo (Aluno)". */
    private List<SalaDto> salasComoAluno;
}
