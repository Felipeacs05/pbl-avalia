package com.uefs.tfs.avaliasystem.US20;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.StudentReportRow;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.WithdrawnStudentRow;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.ReportWarning;
import com.uefs.tfs.avaliasystem.exception.ResourceNotFoundException;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.service.ClassReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClassReportServiceTest {

    @InjectMocks
    private ClassReportService service;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    private UUID tutorId;
    private UUID roomId;
    private User studentA;
    private User studentB;

    @BeforeEach
    void setUp() {
        tutorId = UUID.randomUUID();
        roomId = UUID.randomUUID();

        User tutor = new User();
        tutor.setId(tutorId);
        tutor.setName("Prof. Ana Souza");

        Room room = new Room();
        room.setId(roomId);
        room.setName("Módulo PBL 1");
        room.setTutor(tutor);

        studentA = user("Aluno A");
        studentB = user("Aluno B");

        lenient(room);
    }

    private Room storedRoom;

    private void lenient(Room room) {
        this.storedRoom = room;
    }

    private void givenRoomOwnedByTutor() {
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(storedRoom));
    }

    private User user(String name) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName(name);
        return user;
    }

    private Problem problem(String title, double weight, int dayOffset) {
        Problem problem = new Problem();
        problem.setId(UUID.randomUUID());
        problem.setTitle(title);
        problem.setRoom(storedRoom);
        problem.setWeight(weight);
        problem.setCreatedAt(Instant.parse("2026-03-01T10:00:00Z").plusSeconds(86400L * dayOffset));
        return problem;
    }

    private Feedback grade(Problem problem, User student, double value) {
        Feedback feedback = new Feedback();
        feedback.setId(UUID.randomUUID());
        feedback.setProblem(problem);
        feedback.setStudent(student);
        feedback.setGrade(value);
        feedback.setText("Feedback de " + student.getName());
        return feedback;
    }

    private void givenRoster(User... students) {
        List<RoomMember> members = Arrays.stream(students).map(student -> {
            RoomMember member = new RoomMember();
            member.setRoom(storedRoom);
            member.setUser(student);
            member.setRole(Role.STUDENT);
            member.setActive(true);
            return member;
        }).toList();
        when(roomMemberRepository.findAllRelevantStudentsByRoomId(roomId))
                .thenReturn(members);
    }

    private void givenProblems(Problem... problems) {
        when(problemRepository.findAllByRoomIdOrderByCreatedAtAsc(roomId)).thenReturn(List.of(problems));
    }

    private void givenGrades(Problem problem, Feedback... feedbacks) {
        when(feedbackRepository.findByProblemId(problem.getId())).thenReturn(List.of(feedbacks));
    }

    private StudentReportRow rowOf(ClassReportResponse report, User student) {
        return report.students().stream()
                .filter(row -> row.studentId().equals(student.getId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("O aluno " + student.getName() + " deveria constar na lista de ativos"));
    }

    private WithdrawnStudentRow withdrawnRowOf(ClassReportResponse report, User student) {
        return report.withdrawnStudents().stream()
                .filter(row -> row.studentId().equals(student.getId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("O aluno " + student.getName() + " deveria constar na lista de trancados/cancelados"));
    }

    @Nested
    @DisplayName("[US20] Agrupamento das notas e vínculos")
    class GroupingScenarios {

        @Test
        @DisplayName("[US20] Alunos inativos que possuam notas são incluídos isoladamente no array withdrawnStudents")
        void generateClassReport_IncludesInactiveStudentsWithGradesInWithdrawnArray() {
            User formerStudent = user("Ex-Aluno");
            Problem p1 = problem("Problema 1", 1.0, 0);
            givenRoomOwnedByTutor();

            RoomMember activeMember = new RoomMember();
            activeMember.setRoom(storedRoom);
            activeMember.setUser(studentA);
            activeMember.setActive(true);

            RoomMember inactiveMember = new RoomMember();
            inactiveMember.setRoom(storedRoom);
            inactiveMember.setUser(formerStudent);
            inactiveMember.setActive(false);
            inactiveMember.setUnlinkedAt(Instant.now());

            when(roomMemberRepository.findAllRelevantStudentsByRoomId(roomId))
                    .thenReturn(List.of(activeMember, inactiveMember));

            givenProblems(p1);
            givenGrades(p1, grade(p1, studentA, 8.0), grade(p1, formerStudent, 3.0));

            ClassReportResponse report = service.generateClassReport(roomId, tutorId);

            assertThat(report.students()).extracting(StudentReportRow::studentId).containsExactly(studentA.getId());
            assertThat(report.withdrawnStudents()).extracting(WithdrawnStudentRow::studentId).containsExactly(formerStudent.getId());

            WithdrawnStudentRow formerRow = withdrawnRowOf(report, formerStudent);
            assertThat(formerRow.partialAverage()).isEqualTo(3.0);
        }
    }

    @Nested
    @DisplayName("[US19/US20] Lógica matemática e Valores Limites")
    class WeightedAverageScenarios {

        @Test
        @DisplayName("[US20] Peso negativo na base de dados gera um Warning na resposta e ignora o problema no cálculo")
        void generateClassReport_NegativeWeight_GeneratesWarning() {
            Problem p1 = problem("Problema Corrompido", -1.0, 0);
            givenRoomOwnedByTutor();
            givenRoster(studentA);
            givenProblems(p1);
            givenGrades(p1, grade(p1, studentA, 10.0));

            ClassReportResponse report = service.generateClassReport(roomId, tutorId);

            assertThat(report.warnings()).hasSize(1);
            assertThat(report.warnings().get(0).code()).isEqualTo(ReportWarning.INVALID_WEIGHT);
            assertThat(report.warnings().get(0).problemId()).isEqualTo(p1.getId());

            // The problem was ignored due to invalid weight, so average is null
            assertThat(rowOf(report, studentA).weightedAverage()).isNull();
        }

        @Test
        @DisplayName("[US20] Soma de pesos igual a zero não causa divisão por zero")
        void generateClassReport_ZeroTotalWeight_DoesNotDivideByZero() {
            Problem p1 = problem("Problema 1", 0.0, 0);
            givenRoomOwnedByTutor();
            givenRoster(studentA);
            givenProblems(p1);
            givenGrades(p1, grade(p1, studentA, 9.0));

            ClassReportResponse report = assertDoesNotThrow(() -> service.generateClassReport(roomId, tutorId));

            assertThat(rowOf(report, studentA).weightedAverage()).isNull();
        }
    }
}
