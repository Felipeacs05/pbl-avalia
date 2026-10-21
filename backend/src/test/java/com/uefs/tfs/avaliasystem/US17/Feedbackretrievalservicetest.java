package com.uefs.tfs.avaliasystem.US17;

import com.uefs.tfs.avaliasystem.dto.FeedbackDTO;
import com.uefs.tfs.avaliasystem.dto.PageResponse;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.service.FeedbackRetrievalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Teste unitário da US17 - Camada de Serviço (FeedbackRetrievalTest).
 * Cobertura de critérios:
 * - Sucesso: aluno lê o próprio feedback e o DTO traz o nome do tutor emissor
 * - Segurança: aluno tentando ler feedback de outro aluno recebe AccessDeniedException
 * - Borda: aluno sem feedbacks recebe página vazia (sem erro)
 * - Borda: tutor emissor consegue ler o feedback que criou; tutor não emissor é barrado
 * - Data Leak: o FeedbackDTO não expõe IDs internos, e-mail do tutor nem senhas
 */
@ExtendWith(MockitoExtension.class)
class FeedbackRetrievalServiceTest {

    @InjectMocks
    private FeedbackRetrievalService service;

    @Mock
    private FeedbackRepository feedbackRepository;

    private final Pageable pageable = PageRequest.of(0, 10);

    private UUID studentId;
    private UUID tutorId;
    private Feedback feedback;

    @BeforeEach
    void setUp() {
        // Dado um tutor dono da sala, um aluno e um feedback emitido pelo tutor para o aluno
        studentId = UUID.randomUUID();
        tutorId = UUID.randomUUID();

        User tutor = new User();
        tutor.setId(tutorId);
        tutor.setName("Prof. Ana Souza");
        tutor.setEmail("ana.tutor@uefs.br");
        tutor.setPassword("hash-secreto");

        User student = new User();
        student.setId(studentId);
        student.setName("Aluno Teste");

        Room room = new Room();
        room.setId(UUID.randomUUID());
        room.setTutor(tutor);

        Problem problem = new Problem();
        problem.setId(UUID.randomUUID());
        problem.setTitle("Problema 1");
        problem.setRoom(room);

        feedback = new Feedback();
        feedback.setId(UUID.randomUUID());
        feedback.setProblem(problem);
        feedback.setStudent(student);
        feedback.setGrade(8.5);
        feedback.setText("Excelente participação nas sessões");
    }

    private Page<Feedback> pageOf(Feedback... items) {
        return new PageImpl<>(List.of(items), pageable, items.length);
    }

    @Nested
    @DisplayName("[US17] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US17] Aluno lê o próprio feedback e o DTO traz o nome do tutor emissor")
        void getStudentFeedbacks_OwnStudent_ReturnsFeedbackWithTutorName() {
            // Dado que o aluno possui um feedback direcionado a ele
            when(feedbackRepository.findByStudentIdOrderByCreatedAtDesc(studentId, pageable))
                    .thenReturn(pageOf(feedback));

            // Quando o próprio aluno busca seus feedbacks
            PageResponse<FeedbackDTO> result = service.getStudentFeedbacks(studentId, studentId, pageable);

            // Então recebe o feedback com o nome do tutor, nota e texto
            assertThat(result.content()).hasSize(1);
            FeedbackDTO dto = result.content().get(0);
            assertThat(dto.tutorName()).isEqualTo("Prof. Ana Souza");
            assertThat(dto.problemTitle()).isEqualTo("Problema 1");
            assertThat(dto.grade()).isEqualTo(8.5);
            assertThat(dto.text()).isEqualTo("Excelente participação nas sessões");
            assertThat(result.totalElements()).isEqualTo(1);

            // E a consulta do tutor emissor não é acionada
            verify(feedbackRepository, never()).existsByStudentIdAndProblemRoomTutorId(any(), any());
        }

        @Test
        @DisplayName("[US17] Aluno sem feedbacks recebe página vazia, sem exceção")
        void getStudentFeedbacks_StudentWithoutFeedbacks_ReturnsEmptyPage() {
            // Dado um aluno que ainda não recebeu nenhum feedback
            when(feedbackRepository.findByStudentIdOrderByCreatedAtDesc(studentId, pageable))
                    .thenReturn(new PageImpl<>(List.of(), pageable, 0));

            // Quando ele busca seus feedbacks
            PageResponse<FeedbackDTO> result = service.getStudentFeedbacks(studentId, studentId, pageable);

            // Então recebe uma página vazia e válida
            assertThat(result.content()).as("A lista deve vir vazia").isEmpty();
            assertThat(result.totalElements()).isZero();
            assertThat(result.totalPages()).isZero();
        }

        @Test
        @DisplayName("[US17] Tutor emissor consegue ler o feedback que criou")
        void getStudentFeedbacks_IssuerTutor_ReturnsFeedback() {
            // Dado que o tutor emitiu feedback para o aluno
            when(feedbackRepository.existsByStudentIdAndProblemRoomTutorId(studentId, tutorId)).thenReturn(true);
            when(feedbackRepository.findByStudentIdAndProblemRoomTutorIdOrderByCreatedAtDesc(studentId, tutorId, pageable))
                    .thenReturn(pageOf(feedback));

            // Quando o tutor emissor busca os feedbacks do aluno
            PageResponse<FeedbackDTO> result = service.getStudentFeedbacks(studentId, tutorId, pageable);

            // Então recebe o feedback que ele mesmo criou
            assertThat(result.content()).hasSize(1);
            assertThat(result.content().get(0).tutorName()).isEqualTo("Prof. Ana Souza");
            verify(feedbackRepository, never()).findByStudentIdOrderByCreatedAtDesc(any(), any());
        }
    }

    @Nested
    @DisplayName("[US17] Cenários Inválidos")
    class InvalidScenarios {

        @Test
        @DisplayName("[US17] Aluno tentando ler feedback de outro aluno recebe acesso negado")
        void getStudentFeedbacks_OtherStudent_ThrowsAccessDenied() {
            // Dado um aluno intruso que não é o dono nem emissor de feedbacks
            UUID intruderId = UUID.randomUUID();
            when(feedbackRepository.existsByStudentIdAndProblemRoomTutorId(studentId, intruderId)).thenReturn(false);

            // Quando ele tenta ler os feedbacks de outro aluno
            AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                    () -> service.getStudentFeedbacks(studentId, intruderId, pageable));

            // Então o acesso é negado e nenhum feedback é consultado
            assertThat(ex.getMessage()).contains("Acesso negado");
            verify(feedbackRepository, never()).findByStudentIdOrderByCreatedAtDesc(any(), any());
            verify(feedbackRepository, never())
                    .findByStudentIdAndProblemRoomTutorIdOrderByCreatedAtDesc(any(), any(), any());
        }

        @Test
        @DisplayName("[US17] Tutor que não emitiu feedback para o aluno recebe acesso negado")
        void getStudentFeedbacks_NonIssuerTutor_ThrowsAccessDenied() {
            // Dado um tutor de outra sala, sem feedbacks emitidos para o aluno
            UUID otherTutorId = UUID.randomUUID();
            when(feedbackRepository.existsByStudentIdAndProblemRoomTutorId(studentId, otherTutorId)).thenReturn(false);

            // Quando ele tenta ler os feedbacks do aluno
            assertThrows(AccessDeniedException.class,
                    () -> service.getStudentFeedbacks(studentId, otherTutorId, pageable));

            // Então nada é retornado
            verify(feedbackRepository, never())
                    .findByStudentIdAndProblemRoomTutorIdOrderByCreatedAtDesc(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("[US17] Prevenção de Vazamento de Dados")
    class DataLeakPrevention {

        @Test
        @DisplayName("[US17] FeedbackDTO expõe apenas campos públicos e omite IDs, e-mail e senha")
        void feedbackDto_ExposesOnlyAllowedFields() {
            // Dado o contrato do DTO de feedback
            List<String> fields = Arrays.stream(FeedbackDTO.class.getRecordComponents())
                    .map(RecordComponent::getName)
                    .toList();

            // Então somente os campos permitidos existem
            assertThat(fields)
                    .as("O DTO deve conter somente os campos públicos do feedback")
                    .containsExactlyInAnyOrder("tutorName", "problemTitle", "grade", "text", "createdAt");
            assertThat(fields)
                    .as("O DTO não pode vazar IDs internos, e-mail ou senha")
                    .doesNotContain("id", "studentId", "problemId", "tutorId", "tutorEmail", "email", "password");
        }

        @Test
        @DisplayName("[US17] Conteúdo mapeado não carrega e-mail nem senha do tutor")
        void mappedDto_DoesNotCarryTutorEmailOrPassword() {
            // Dado um feedback cujo tutor possui e-mail e senha
            when(feedbackRepository.findByStudentIdOrderByCreatedAtDesc(studentId, pageable))
                    .thenReturn(pageOf(feedback));

            // Quando o aluno busca seus feedbacks
            PageResponse<FeedbackDTO> result = service.getStudentFeedbacks(studentId, studentId, pageable);

            // Então a representação textual do DTO não contém dados sensíveis
            assertThat(result.content().get(0).toString())
                    .doesNotContain("ana.tutor@uefs.br")
                    .doesNotContain("hash-secreto");
        }
    }
}