package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import org.junit.jupiter.params.provider.Arguments;

import java.util.stream.Stream;

/**
 * Utilitário centralizado de payloads e cenários inválidos para testes de critérios (US07).
 * Garante paridade absoluta entre as camadas de Controller, Integração e E2E (Selenium).
 */
public final class InvalidCriterionPayloads {

    private InvalidCriterionPayloads() {
        // Classe utilitária - construtor privado
    }

    public static final String REQUIRED_NAME_ERROR_FRONTEND = "O nome do critério é obrigatório.";
    public static final String INVALID_CHARACTERS_ERROR_FRONTEND = "O nome do critério contém caracteres inválidos. Utilize apenas letras, números e hifens.";

    /**
     * Fornece payloads inválidos no formato DTO para testes de API (Controller e Integração).
     * Cobrindo:
     * - Nome vazio ("")
     * - Nome apenas com espaços em branco ("   ")
     * - Script executável / XSS ("<script>alert(1)</script>")
     * - Caracteres especiais proibidos ("* # ; % $ @ ! ' \"")
     * - Nome excedendo limite máximo de 255 caracteres (256 chars)
     * - Peso numérico negativo (-1.0)
     * - Corpo sem criteriaName (nulo)
     */
    public static Stream<Arguments> provideInvalidCriterionRequests() {
        return Stream.of(
                Arguments.of("Nome vazio", new CriterionRequest("", "Descrição Válida", 1.0)),
                Arguments.of("Nome apenas com espaços em branco", new CriterionRequest("   ", "Descrição Válida", 1.0)),
                Arguments.of("Injeção de script (XSS)", new CriterionRequest("<script>alert(1)</script>", "Descrição Válida", 1.0)),
                Arguments.of("Caracteres especiais proibidos (* # ; % $ @ ! ' \")", new CriterionRequest("Postura * # ; % $ @ ! ' \"", "Descrição Válida", 1.0)),
                Arguments.of("Nome excedendo limite de 255 caracteres (256 caracteres)", new CriterionRequest("A".repeat(256), "Descrição Válida", 1.0)),
                Arguments.of("Peso negativo", new CriterionRequest("Critério Válido", "Descrição Válida", -1.0)),
                Arguments.of("Corpo sem criteriaName (nulo)", new CriterionRequest(null, "Descrição Válida", 1.0))
        );
    }

    /**
     * Fornece os casos de teste para a interface do frontend (Selenium).
     * Retorna: Cenário descritivo, criteriaName, criteriaDescription, criteriaWeight, mensagem de erro esperada na UI.
     */
    public static Stream<Arguments> provideInvalidCasesForFrontend() {
        return Stream.of(
                Arguments.of("Nome vazio", "", "Descrição Válida", "1.0", REQUIRED_NAME_ERROR_FRONTEND),
                Arguments.of("Nome apenas com espaços em branco", "   ", "Descrição Válida", "1.0", REQUIRED_NAME_ERROR_FRONTEND),
                Arguments.of("Injeção de script (XSS)", "<script>alert(1)</script>", "Descrição Válida", "1.0", INVALID_CHARACTERS_ERROR_FRONTEND),
                Arguments.of("Caracteres especiais proibidos", "Postura * # ; % $ @ ! ' \"", "Descrição Válida", "1.0", INVALID_CHARACTERS_ERROR_FRONTEND)
        );
    }
}
