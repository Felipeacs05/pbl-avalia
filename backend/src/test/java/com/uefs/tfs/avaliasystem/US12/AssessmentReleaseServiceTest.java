package com.uefs.tfs.avaliasystem.US12;

import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.service.AssessmentReleaseService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Teste unitário puro da US12 - Camada de Serviço.
 * Cobertura de critérios:
 * - Alternância do toggle de autoavaliação pelo tutor da sala
 * - Alternância do toggle de avaliação entre pares pelo tutor da sala
 * - Bloqueio de acesso quando o usuário não é o tutor responsável
 * - Garantia de que nenhuma persistência ocorre em cenários proibidos
 */
@ExtendWith(MockitoExtension.class)
class AssessmentReleaseServiceTest {

    @InjectMocks
    private AssessmentReleaseService service;

    @Mock
    private ProblemRepository problemRepository;

    @Nested
    @DisplayName("[US12] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US12] toggle de autoavaliação - tutor da sala aciona - deve inverter a flag e persistir")
        void toggleSelfAssessment_WhenTutorTriggers_ShouldInvertFlagAndSave() {
            // Prepara: tutor responsável pela sala aciona o toggle de autoavaliação
            UUID tutorId = UUID.randomUUID();
            User tutor = new User();
            tutor.setId(tutorId);

            Room room = new Room();
            room.setTutor(tutor);

            Problem problem = new Problem();
            problem.setRoom(room);
            problem.setSelfAssessmentReleased(false); // estado inicial: fechado

            when(problemRepository.findById(any())).thenReturn(Optional.of(problem));
            when(problemRepository.save(any())).thenReturn(problem);

            // Executa: tutor inverte o status de autoavaliação
            service.toggleSelfAssessment(UUID.randomUUID(), tutorId);

            // Valida: flag invertida para aberto e repositório acionado para salvar
            assertThat(problem.getSelfAssessmentReleased())
                    .as("O status de liberação da autoavaliação deve ser atualizado para verdadeiro")
                    .isTrue();
            verify(problemRepository, times(1)).save(problem);
        }

        @Test
        @DisplayName("[US12] toggle de pares - tutor da sala aciona - deve inverter a flag de pares e persistir")
        void togglePeerAssessment_WhenTutorTriggers_ShouldInvertFlagAndSave() {
            // Prepara: tutor responsável pela sala aciona o toggle de avaliação entre pares
            UUID tutorId = UUID.randomUUID();
            User tutor = new User();
            tutor.setId(tutorId);

            Room room = new Room();
            room.setTutor(tutor);

            Problem problem = new Problem();
            problem.setRoom(room);
            problem.setPeerAssessmentReleased(false); // estado inicial: fechado

            when(problemRepository.findById(any())).thenReturn(Optional.of(problem));
            when(problemRepository.save(any())).thenReturn(problem);

            // Executa: tutor inverte o status de avaliação entre pares
            service.togglePeerAssessment(UUID.randomUUID(), tutorId);

            // Valida: flag de pares invertida para aberto
            assertThat(problem.getPeerAssessmentReleased())
                    .as("O status de liberação da avaliação entre pares deve ser atualizado para verdadeiro")
                    .isTrue();
            verify(problemRepository, times(1)).save(problem);
        }
    }

    @Nested
    @DisplayName("[US12] Cenários Inválidos")
    class InvalidScenarios {

        @Test
        @DisplayName("[US12] toggle de autoavaliação - usuário não é tutor da sala - deve lançar exceção e não gravar no banco")
        void toggleSelfAssessment_WhenNonTutorTriggers_ShouldThrowAndNotPersist() {
            // Prepara: usuário sem papel de tutor tenta acionar a chave seletora
            UUID tutorId = UUID.randomUUID();
            UUID intrusoId = UUID.randomUUID(); // usuário diferente do tutor real da sala

            User tutor = new User();
            tutor.setId(tutorId);

            Room room = new Room();
            room.setTutor(tutor);

            Problem problem = new Problem();
            problem.setRoom(room);

            when(problemRepository.findById(any())).thenReturn(Optional.of(problem));

            // Valida: AccessDeniedException lançada e banco completamente intacto
            assertThrows(AccessDeniedException.class, () ->
                    service.toggleSelfAssessment(UUID.randomUUID(), intrusoId)
            );
            // Garante que nenhuma alteração foi persistida no banco de dados
            verify(problemRepository, never()).save(any());
        }
    }
}
