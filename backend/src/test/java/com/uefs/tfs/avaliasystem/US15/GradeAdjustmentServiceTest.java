package com.uefs.tfs.avaliasystem.US15;

import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentRequest;
import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentResponse;
import com.uefs.tfs.avaliasystem.exception.AssessmentNotFoundException;
import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.service.GradeAdjustmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
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
 * Teste unitário da US15 - Camada de Serviço.
 * Cobertura de critérios:
 * - Auditoria: nota original preservada, nota ajustada e justificativa gravadas, flag modifiedByTutor = true
 * - Justificativa obrigatória: nula, vazia ou em branco lança exceção e nada é persistido
 * - Segurança: usuário que não é tutor da sala recebe AccessDeniedException e nada é persistido
 * - Avaliação inexistente: lança AssessmentNotFoundException e nada é persistido
 */
@ExtendWith(MockitoExtension.class)
class GradeAdjustmentServiceTest {

    @InjectMocks
    private GradeAdjustmentService service;

    @Mock
    private AssessmentRepository assessmentRepository;

    private UUID tutorId;
    private UUID assessmentId;
    private Assessment assessment;

    @BeforeEach
    void setUp() {
        // Dado um tutor dono da sala e uma autoavaliação de nota 6.0 enviada pelo aluno
        tutorId = UUID.randomUUID();
        assessmentId = UUID.randomUUID();

        User tutor = new User();
        tutor.setId(tutorId);

        Room room = new Room();
        room.setTutor(tutor);

        Problem problem = new Problem();
        problem.setRoom(room);

        assessment = new Assessment();
        assessment.setId(assessmentId);
        assessment.setProblem(problem);
        assessment.setScore(6.0);
        assessment.setComment("Participei de todas as sessões");
    }

    @Nested
    @DisplayName("[US15] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US15] Tutor ajusta a nota com justificativa: preserva a original e grava o ajuste")
        void adjustGrade_TutorWithJustification_PreservesOriginalAndSavesAdjustment() {
            // Dado que o repositório encontra a avaliação e devolve a entidade salva
            when(assessmentRepository.findById(assessmentId)).thenReturn(Optional.of(assessment));
            when(assessmentRepository.save(any(Assessment.class))).thenAnswer(inv -> inv.getArgument(0));
            GradeAdjustmentRequest request = new GradeAdjustmentRequest(8.5, "Nota subestimada frente ao desempenho");

            // Quando o tutor da sala ajusta a nota
            GradeAdjustmentResponse response = service.adjustGrade(assessmentId, tutorId, request);

            // Então o repositório recebe a entidade com auditoria completa
            ArgumentCaptor<Assessment> captor = ArgumentCaptor.forClass(Assessment.class);
            verify(assessmentRepository, times(1)).save(captor.capture());
            Assessment saved = captor.getValue();

            assertThat(saved.getOriginalGrade()).as("A nota original deve ser preservada").isEqualTo(6.0);
            assertThat(saved.getAdjustedGrade()).as("A nota ajustada deve ser gravada").isEqualTo(8.5);
            assertThat(saved.getScore())
                    .as("A nota efetiva (score) deve passar a ser a nota ajustada pelo tutor")
                    .isEqualTo(8.5);
            assertThat(saved.getJustification()).isEqualTo("Nota subestimada frente ao desempenho");
            assertThat(saved.getModifiedByTutor()).as("A flag de modificação deve ser verdadeira").isTrue();

            // E a resposta permite ao frontend identificar a modificação
            assertThat(response.modifiedByTutor()).isTrue();
            assertThat(response.originalGrade()).isEqualTo(6.0);
            assertThat(response.adjustedGrade()).isEqualTo(8.5);
        }

        @Test
        @DisplayName("[US15] Segundo ajuste do tutor mantém a nota original do primeiro envio do aluno")
        void adjustGrade_SecondAdjustment_KeepsFirstSubmittedOriginalGrade() {
            // Dado uma avaliação que já foi ajustada uma vez (original 6.0, efetiva 8.0)
            assessment.setOriginalGrade(6.0);
            assessment.setAdjustedGrade(8.0);
            assessment.setScore(8.0);
            assessment.setModifiedByTutor(true);

            when(assessmentRepository.findById(assessmentId)).thenReturn(Optional.of(assessment));
            when(assessmentRepository.save(any(Assessment.class))).thenAnswer(inv -> inv.getArgument(0));

            // Quando o tutor ajusta novamente
            service.adjustGrade(assessmentId, tutorId, new GradeAdjustmentRequest(7.0, "Reavaliação após conversa com o aluno"));

            // Então a nota original continua sendo a do envio inicial do aluno
            ArgumentCaptor<Assessment> captor = ArgumentCaptor.forClass(Assessment.class);
            verify(assessmentRepository).save(captor.capture());
            assertThat(captor.getValue().getOriginalGrade()).isEqualTo(6.0);
            assertThat(captor.getValue().getAdjustedGrade()).isEqualTo(7.0);
            assertThat(captor.getValue().getScore()).isEqualTo(7.0);
        }
    }

    @Nested
    @DisplayName("[US15] Cenários Inválidos")
    class InvalidScenarios {

        @ParameterizedTest(name = "justificativa = [{0}]")
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t\n"})
        @DisplayName("[US15] Ajuste sem justificativa lança exceção e não persiste nada")
        void adjustGrade_WithoutJustification_ThrowsAndDoesNotPersist(String justification) {
            // Dado um pedido de ajuste sem justificativa válida
            GradeAdjustmentRequest request = new GradeAdjustmentRequest(8.0, justification);

            // Quando o tutor tenta ajustar a nota
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> service.adjustGrade(assessmentId, tutorId, request));

            // Então a exceção informa o motivo e nada é lido ou gravado
            assertThat(ex.getMessage()).isEqualTo("Justificativa é obrigatória");
            verifyNoInteractions(assessmentRepository);
        }

        @Test
        @DisplayName("[US15] Usuário que não é tutor da sala recebe acesso negado e nada é persistido")
        void adjustGrade_NonTutorUser_ThrowsAccessDeniedAndDoesNotPersist() {
            // Dado um aluno (que não é o tutor da sala) tentando ajustar a nota
            UUID studentId = UUID.randomUUID();
            when(assessmentRepository.findById(assessmentId)).thenReturn(Optional.of(assessment));

            // Quando ele aciona o ajuste
            assertThrows(AccessDeniedException.class, () ->
                    service.adjustGrade(assessmentId, studentId, new GradeAdjustmentRequest(10.0, "Quero nota máxima")));

            // Então nada é persistido e a nota original permanece intacta
            verify(assessmentRepository, never()).save(any());
            assertThat(assessment.getScore()).isEqualTo(6.0);
            assertThat(assessment.getModifiedByTutor()).isFalse();
        }

        @Test
        @DisplayName("[US15] Avaliação inexistente lança exceção de não encontrado e nada é persistido")
        void adjustGrade_NonExistentAssessment_ThrowsAssessmentNotFoundException() {
            // Dado que a avaliação não existe
            when(assessmentRepository.findById(assessmentId)).thenReturn(Optional.empty());

            // Quando o tutor tenta ajustar
            AssessmentNotFoundException ex = assertThrows(AssessmentNotFoundException.class, () ->
                    service.adjustGrade(assessmentId, tutorId, new GradeAdjustmentRequest(8.0, "Justificativa")));

            // Então a exceção informa o motivo e nada é gravado
            assertThat(ex.getMessage()).isEqualTo("Avaliação não encontrada");
            verify(assessmentRepository, never()).save(any());
        }
    }
}