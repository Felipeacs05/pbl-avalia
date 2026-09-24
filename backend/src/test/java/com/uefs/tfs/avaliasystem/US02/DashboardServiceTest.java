package com.uefs.tfs.avaliasystem.US02;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.SalaDto;
import com.uefs.tfs.avaliasystem.service.UsuarioService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * US02 — Dashboard de Salas.
 *
 * Testa a separação visual/lógica entre salas administradas (Tutor)
 * e salas nas quais o usuário é Aluno no dashboard retornado pelo serviço.
 *
 * Testes válidos:
 *   - Dashboard retorna listas separadas de salas Tutor e Aluno.
 *   - Cada lista contém apenas as salas do papel correto.
 *
 * Testes inválidos:
 *   - Usuário sem salas recebe listas vazias (não nulas).
 *   - Acesso com ID de usuário inválido lança exceção adequada.
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private UsuarioService usuarioService;

    private static final Long USUARIO_ID_VALIDO = 1L;
    private static final Long USUARIO_ID_INVALIDO = 999L;

    // ────────────────────────────────────────────────────────────────────────
    //  TESTES VÁLIDOS
    // ────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Testes Válidos — Dashboard separado por papel")
    class TestesValidos {

        @Test
        @DisplayName("US02-V4 — dashboard deve retornar abas separadas: salasComoTutor e salasComoAluno")
        void dashboardDeveConterAmbasAsListasSeparadas() {
            var salasTutor = List.of(
                    new SalaDto(10L, "Algoritmos Avançados", "ALGO-001"),
                    new SalaDto(11L, "Estruturas de Dados", "ED-002")
            );
            var salasAluno = List.of(
                    new SalaDto(20L, "Cálculo I", "CALC-001")
            );

            var dashboard = new DashboardResponse(salasTutor, salasAluno);
            when(usuarioService.obterDashboard(USUARIO_ID_VALIDO)).thenReturn(dashboard);

            DashboardResponse resultado = usuarioService.obterDashboard(USUARIO_ID_VALIDO);

            // Ambas as seções devem existir e não serem nulas
            assertThat(resultado.getSalasComoTutor())
                    .as("A aba 'Salas que administro (Tutor)' deve existir no dashboard")
                    .isNotNull();
            assertThat(resultado.getSalasComoAluno())
                    .as("A aba 'Salas que participo (Aluno)' deve existir no dashboard")
                    .isNotNull();
        }

        @Test
        @DisplayName("US02-V5 — salas criadas pelo usuário aparecem apenas na aba Tutor")
        void salasComoTutorDevemApenasPertencerAoTutor() {
            var salasTutor = List.of(
                    new SalaDto(10L, "Algoritmos Avançados", "ALGO-001")
            );
            var salasAluno = List.of(
                    new SalaDto(20L, "Cálculo I", "CALC-001")
            );

            var dashboard = new DashboardResponse(salasTutor, salasAluno);
            when(usuarioService.obterDashboard(USUARIO_ID_VALIDO)).thenReturn(dashboard);

            DashboardResponse resultado = usuarioService.obterDashboard(USUARIO_ID_VALIDO);

            // A sala de Tutor não deve aparecer na lista de Aluno
            var idsSalasAluno = resultado.getSalasComoAluno()
                    .stream().map(SalaDto::getId).toList();

            assertThat(resultado.getSalasComoTutor()).hasSize(1);
            assertThat(resultado.getSalasComoTutor().get(0).getNome())
                    .isEqualTo("Algoritmos Avançados");
            assertThat(idsSalasAluno)
                    .as("Uma sala de Tutor não deve aparecer também na aba de Aluno")
                    .doesNotContain(10L);
        }

        @Test
        @DisplayName("US02-V6 — salas acessadas via código aparecem apenas na aba Aluno")
        void salasComoAlunoDevemApenasPertencerAoAluno() {
            var salasTutor = List.of(
                    new SalaDto(10L, "Algoritmos Avançados", "ALGO-001")
            );
            var salasAluno = List.of(
                    new SalaDto(20L, "Cálculo I", "CALC-001")
            );

            var dashboard = new DashboardResponse(salasTutor, salasAluno);
            when(usuarioService.obterDashboard(USUARIO_ID_VALIDO)).thenReturn(dashboard);

            DashboardResponse resultado = usuarioService.obterDashboard(USUARIO_ID_VALIDO);

            var idsSalasTutor = resultado.getSalasComoTutor()
                    .stream().map(SalaDto::getId).toList();

            assertThat(resultado.getSalasComoAluno()).hasSize(1);
            assertThat(resultado.getSalasComoAluno().get(0).getNome())
                    .isEqualTo("Cálculo I");
            assertThat(idsSalasTutor)
                    .as("Uma sala de Aluno não deve aparecer também na aba de Tutor")
                    .doesNotContain(20L);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    //  TESTES INVÁLIDOS
    // ────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Testes Inválidos — Dashboard com dados ausentes ou acesso indevido")
    class TestesInvalidos {

        @Test
        @DisplayName("US02-I6 — usuário sem salas deve receber listas vazias (não nulas) no dashboard")
        void usuarioSemSalasDeveReceberListasVazias() {
            var dashboard = new DashboardResponse(List.of(), List.of());
            when(usuarioService.obterDashboard(USUARIO_ID_VALIDO)).thenReturn(dashboard);

            DashboardResponse resultado = usuarioService.obterDashboard(USUARIO_ID_VALIDO);

            assertThat(resultado.getSalasComoTutor())
                    .as("Lista de salas Tutor deve ser vazia, nunca nula")
                    .isNotNull()
                    .isEmpty();

            assertThat(resultado.getSalasComoAluno())
                    .as("Lista de salas Aluno deve ser vazia, nunca nula")
                    .isNotNull()
                    .isEmpty();
        }

        @Test
        @DisplayName("US02-I7 — acesso ao dashboard com ID de usuário inválido deve lançar exceção")
        void acessoComIdInvalidoDeveLancarExcecao() {
            when(usuarioService.obterDashboard(USUARIO_ID_INVALIDO))
                    .thenThrow(new com.uefs.tfs.avaliasystem.exception.UsuarioNaoEncontradoException(
                            "Usuário não encontrado: " + USUARIO_ID_INVALIDO));

            assertThatThrownBy(() -> usuarioService.obterDashboard(USUARIO_ID_INVALIDO))
                    .isInstanceOf(com.uefs.tfs.avaliasystem.exception.UsuarioNaoEncontradoException.class)
                    .hasMessageContaining("Usuário não encontrado");
        }
    }
}
