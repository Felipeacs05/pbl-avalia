package com.uefs.tfs.avaliasystem.US16;

import com.uefs.tfs.avaliasystem.dto.FeedbackBatchDTO;
import com.uefs.tfs.avaliasystem.dto.FeedbackRequest;
import com.uefs.tfs.avaliasystem.dto.FeedbackResponse;
import com.uefs.tfs.avaliasystem.exception.ProblemNotFoundException;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.service.FeedbackService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Teste unitário da US16 - Camada de Serviço.
 * Cobertura de critérios:
 * - Envio individual: feedback com nota e texto é salvo para o aluno da sala
 * - Envio em lote (desempenho): usa uma única consulta de alunos e um único saveAll(), nunca save() em loop
 * - Validação: nota nula/fora do intervalo ou texto em branco lança exceção e nada é persistido
 * - Segurança: apenas o tutor da sala envia; alunos fora da sala e problema inexistente são rejeitados
 */
@ExtendWith(MockitoExtension.class)
class FeedbackServiceTest {

    private static final int CLASS_SIZE = 40;

    @InjectMocks
    private FeedbackService service;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private FeedbackRepository feedbackRepository;

    @Captor
    private ArgumentCaptor<List<Feedback>> feedbackListCaptor;

    private UUID tutorId;
    private UUID problemId;
    private UUID roomId;
    private Problem problem;

    @BeforeEach
    void setUp() {
        // Dado um tutor dono da sala e um problema vinculado a essa sala
        tutorId = UUID.randomUUID();
        problemId = UUID.randomUUID();
        roomId = UUID.randomUUID();

        User tutor = new User();
        tutor.setId(tutorId);

        Room room = new Room();
        room.setId(roomId);
        room.setTutor(tutor);

        problem = new Problem();
        problem.setId(problemId);
        problem.setRoom(room);
    }

    private RoomMember buildStudentMember(UUID studentId) {
        User student = new User();
        student.setId(studentId);

        RoomMember member = new RoomMember();
        member.setUser(student);
        member.setRole(Role.STUDENT);
        member.setActive(true);
        return member;
    }

    @Nested
    @DisplayName("[US16] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US16] Envio individual com nota e texto preenchidos salva o feedback do aluno")
        void sendFeedback_WithGradeAndText_SavesFeedback() {
            // Dado um aluno ativo da sala e um repositório que devolve a entidade salva
            UUID studentId = UUID.randomUUID();
            when(problemRepository.findById(problemId)).thenReturn(Optional.of(problem));
            when(roomMemberRepository.findByRoomIdAndUserId(roomId, studentId))
                    .thenReturn(Optional.of(buildStudentMember(studentId)));
            when(feedbackRepository.save(any(Feedback.class))).thenAnswer(inv -> inv.getArgument(0));

            // Quando o tutor envia o feedback individual
            FeedbackResponse response = service.sendFeedback(problemId, tutorId,
                    new FeedbackRequest(studentId, 8.5, "  Excelente participação nas sessões  "));

            // Então o repositório recebe a entidade com problema, aluno, nota e texto
            ArgumentCaptor<Feedback> captor = ArgumentCaptor.forClass(Feedback.class);
            verify(feedbackRepository, times(1)).save(captor.capture());
            Feedback saved = captor.getValue();

            assertThat(saved.getProblem()).isSameAs(problem);
            assertThat(saved.getStudent().getId()).isEqualTo(studentId);
            assertThat(saved.getGrade()).isEqualTo(8.5);
            assertThat(saved.getText()).as("O texto deve ser salvo sem espaços nas pontas")
                    .isEqualTo("Excelente participação nas sessões");

            // E a resposta devolve os dados do feedback
            assertThat(response.studentId()).isEqualTo(studentId);
            assertThat(response.grade()).isEqualTo(8.5);
        }

        @Test
        @DisplayName("[US16] Envio em lote usa um único saveAll e uma única consulta, sem save() em loop")
        void sendBatchFeedback_WholeClass_UsesSingleSaveAllAndSingleLookup() {
            // Dado uma turma de 40 alunos ativos na sala
            List<UUID> studentIds = new ArrayList<>();
            List<RoomMember> members = new ArrayList<>();
            List<FeedbackRequest> requests = new ArrayList<>();
            for (int i = 0; i < CLASS_SIZE; i++) {
                UUID studentId = UUID.randomUUID();
                studentIds.add(studentId);
                members.add(buildStudentMember(studentId));
                requests.add(new FeedbackRequest(studentId, 7.0 + (i % 4), "Feedback do aluno " + i));
            }
            when(problemRepository.findById(problemId)).thenReturn(Optional.of(problem));
            when(roomMemberRepository.findByRoomIdAndUserIdIn(eq(roomId), anyCollection())).thenReturn(members);
            when(feedbackRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

            // Quando o tutor dispara o feedback para toda a turma
            List<FeedbackResponse> responses = service.sendBatchFeedback(problemId, tutorId, new FeedbackBatchDTO(requests));

            // Então todos os feedbacks são gravados em uma única operação em lote
            verify(feedbackRepository, times(1)).saveAll(feedbackListCaptor.capture());
            assertThat(feedbackListCaptor.getValue()).hasSize(CLASS_SIZE);
            assertThat(feedbackListCaptor.getValue())
                    .extracting(f -> f.getStudent().getId())
                    .containsExactlyElementsOf(studentIds);

            // E nunca há save() individual nem uma consulta por aluno (evita o gargalo N+1)
            verify(feedbackRepository, never()).save(any());
            verify(roomMemberRepository, times(1)).findByRoomIdAndUserIdIn(eq(roomId), anyCollection());
            verify(roomMemberRepository, never()).findByRoomIdAndUserId(any(), any());

            // E a resposta contém um item por aluno
            assertThat(responses).hasSize(CLASS_SIZE);
        }
    }

    @Nested
    @DisplayName("[US16] Cenários Inválidos")
    class InvalidScenarios {

        @ParameterizedTest(name = "texto = [{0}]")
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t\n"})
        @DisplayName("[US16] Feedback com texto em branco lança exceção e não persiste nada")
        void sendFeedback_BlankText_ThrowsAndDoesNotPersist(String text) {
            // Dado um feedback com nota válida, mas sem texto
            FeedbackRequest request = new FeedbackRequest(UUID.randomUUID(), 8.0, text);

            // Quando o tutor tenta enviar
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> service.sendFeedback(problemId, tutorId, request));

            // Então a exceção informa o motivo e nenhum repositório é acionado
            assertThat(ex.getMessage()).isEqualTo("O texto do feedback não pode ser vazio");
            verifyNoInteractions(problemRepository, roomMemberRepository, feedbackRepository);
        }

        @Test
        @DisplayName("[US16] Feedback com nota nula lança exceção e não persiste nada")
        void sendFeedback_NullGrade_ThrowsAndDoesNotPersist() {
            // Dado um feedback com texto válido, mas sem nota
            FeedbackRequest request = new FeedbackRequest(UUID.randomUUID(), null, "Bom trabalho");

            // Quando o tutor tenta enviar
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> service.sendFeedback(problemId, tutorId, request));

            // Então a exceção informa o motivo e nenhum repositório é acionado
            assertThat(ex.getMessage()).isEqualTo("A nota é obrigatória");
            verifyNoInteractions(problemRepository, roomMemberRepository, feedbackRepository);
        }

        @ParameterizedTest(name = "nota = {0}")
        @ValueSource(doubles = {-0.1, 10.1})
        @DisplayName("[US16] Feedback com nota fora do intervalo de 0 a 10 lança exceção")
        void sendFeedback_GradeOutOfRange_ThrowsAndDoesNotPersist(double grade) {
            // Dado uma nota fora dos limites
            FeedbackRequest request = new FeedbackRequest(UUID.randomUUID(), grade, "Texto válido");

            // Quando o tutor tenta enviar
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> service.sendFeedback(problemId, tutorId, request));

            // Então a exceção informa o motivo e nada é gravado
            assertThat(ex.getMessage()).isEqualTo("A nota deve estar entre 0 e 10");
            verifyNoInteractions(problemRepository, roomMemberRepository, feedbackRepository);
        }

        @Test
        @DisplayName("[US16] Lote com um item inválido é rejeitado por inteiro e nada é persistido")
        void sendBatchFeedback_OneInvalidItem_RejectsWholeBatch() {
            // Dado um lote com 2 itens válidos e 1 sem texto
            List<FeedbackRequest> requests = List.of(
                    new FeedbackRequest(UUID.randomUUID(), 8.0, "Bom"),
                    new FeedbackRequest(UUID.randomUUID(), 9.0, "   "),
                    new FeedbackRequest(UUID.randomUUID(), 7.0, "Regular"));

            // Quando o tutor tenta enviar o lote
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> service.sendBatchFeedback(problemId, tutorId, new FeedbackBatchDTO(requests)));

            // Então o lote inteiro é barrado antes de qualquer acesso ao banco
            assertThat(ex.getMessage()).isEqualTo("O texto do feedback não pode ser vazio");
            verifyNoInteractions(problemRepository, roomMemberRepository, feedbackRepository);
        }

        @Test
        @DisplayName("[US16] Lote com lista vazia lança exceção")
        void sendBatchFeedback_EmptyList_Throws() {
            // Dado um lote sem nenhum feedback
            // Quando o tutor tenta enviar
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> service.sendBatchFeedback(problemId, tutorId, new FeedbackBatchDTO(List.of())));

            // Então a exceção informa o motivo
            assertThat(ex.getMessage()).isEqualTo("A lista de feedbacks não pode estar vazia");
            verifyNoInteractions(problemRepository, roomMemberRepository, feedbackRepository);
        }

        @Test
        @DisplayName("[US16] Usuário que não é tutor da sala recebe acesso negado e nada é persistido")
        void sendFeedback_NonTutorUser_ThrowsAccessDeniedAndDoesNotPersist() {
            // Dado um aluno (que não é o tutor da sala) tentando enviar feedback
            UUID studentId = UUID.randomUUID();
            when(problemRepository.findById(problemId)).thenReturn(Optional.of(problem));

            // Quando ele aciona o envio
            assertThrows(AccessDeniedException.class, () ->
                    service.sendFeedback(problemId, studentId, new FeedbackRequest(UUID.randomUUID(), 10.0, "Quero enviar")));

            // Então nada é persistido
            verify(feedbackRepository, never()).save(any());
            verify(feedbackRepository, never()).saveAll(anyList());
        }

        @Test
        @DisplayName("[US16] Problema inexistente lança exceção de não encontrado")
        void sendFeedback_NonExistentProblem_ThrowsProblemNotFoundException() {
            // Dado que o problema não existe
            when(problemRepository.findById(problemId)).thenReturn(Optional.empty());

            // Quando o tutor tenta enviar
            ProblemNotFoundException ex = assertThrows(ProblemNotFoundException.class, () ->
                    service.sendFeedback(problemId, tutorId, new FeedbackRequest(UUID.randomUUID(), 8.0, "Bom")));

            // Então a exceção informa o motivo e nada é gravado
            assertThat(ex.getMessage()).isEqualTo("Problema não encontrado");
            verify(feedbackRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US16] Envio individual para aluno que não pertence à sala é rejeitado")
        void sendFeedback_StudentNotInRoom_ThrowsAndDoesNotPersist() {
            // Dado um aluno que não é membro da sala
            UUID outsiderId = UUID.randomUUID();
            when(problemRepository.findById(problemId)).thenReturn(Optional.of(problem));
            when(roomMemberRepository.findByRoomIdAndUserId(roomId, outsiderId)).thenReturn(Optional.empty());

            // Quando o tutor tenta enviar o feedback
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    service.sendFeedback(problemId, tutorId, new FeedbackRequest(outsiderId, 8.0, "Bom")));

            // Então a exceção informa o motivo e nada é gravado
            assertThat(ex.getMessage()).isEqualTo("O aluno não pertence a esta sala");
            verify(feedbackRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US16] Lote com aluno que não pertence à sala é rejeitado por inteiro")
        void sendBatchFeedback_StudentNotInRoom_RejectsWholeBatch() {
            // Dado um lote com 2 alunos, mas só 1 é membro ativo da sala
            UUID memberId = UUID.randomUUID();
            UUID outsiderId = UUID.randomUUID();
            when(problemRepository.findById(problemId)).thenReturn(Optional.of(problem));
            when(roomMemberRepository.findByRoomIdAndUserIdIn(eq(roomId), anyCollection()))
                    .thenReturn(List.of(buildStudentMember(memberId)));

            List<FeedbackRequest> requests = List.of(
                    new FeedbackRequest(memberId, 8.0, "Bom"),
                    new FeedbackRequest(outsiderId, 9.0, "Ótimo"));

            // Quando o tutor tenta enviar o lote
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> service.sendBatchFeedback(problemId, tutorId, new FeedbackBatchDTO(requests)));

            // Então o lote inteiro é rejeitado e nada é gravado
            assertThat(ex.getMessage()).isEqualTo("Um ou mais alunos não pertencem a esta sala");
            verify(feedbackRepository, never()).saveAll(anyList());
        }
    }
}