package com.uefs.tfs.avaliasystem.US10;

import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentRequest;
import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentResponse;
import com.uefs.tfs.avaliasystem.exception.SessionRoleConflictException;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.PerformanceTableService;
import com.uefs.tfs.avaliasystem.service.SessionRoleAssignmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

// Teste unitário puro: repositórios e o cálculo da US08 mockados, sem contexto Spring e sem banco
@ExtendWith(MockitoExtension.class)
@DisplayName("[US10] Service de papéis da sessão")
class SessionRoleAssignmentServiceTest {

    @InjectMocks
    private SessionRoleAssignmentService sessionRoleAssignmentService;

    @Mock
    private SessionRoleAssignmentRepository sessionRoleAssignmentRepository;

    @Mock
    private TutoringSessionRepository tutoringSessionRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    @Mock
    private UserRepository userRepository;

    // A fórmula padrão é a da US08: mockada, o teste isola só a soma da nota extra
    @Mock
    private PerformanceTableService performanceTableService;

    @Captor
    private ArgumentCaptor<SessionRoleAssignment> assignmentCaptor;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID OTHER_TUTOR_UUID = UUID.fromString("444e4444-e44b-44d4-a444-444444444444");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-99d9-a999-999999999999");
    private final UUID ROOM_UUID = UUID.fromString("987e6543-e21b-12d3-a456-426614174000");
    private final UUID PROBLEM_UUID = UUID.fromString("555e5555-e55b-55d5-a555-555555555555");
    private final UUID SESSION_UUID = UUID.fromString("777e7777-e77b-77d7-a777-777777777777");
    private final UUID ASSIGNMENT_UUID = UUID.fromString("222e2222-e22b-22d2-a222-222222222222");
    private final UUID TABLE_UUID = UUID.fromString("771a3400-e29b-41d4-b825-112233445566");
    private final UUID CONTENT_UUID = UUID.fromString("881a3400-e29b-41d4-b825-112233445561");

    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode atribuir papéis da sessão.";
    private static final String ROLE_TAKEN_MESSAGE = "Este papel já foi atribuído a outro aluno nesta sessão.";
    private static final String STUDENT_HAS_ROLE_MESSAGE = "Este aluno já possui um papel nesta sessão.";
    private static final String NOT_ACTIVE_STUDENT_MESSAGE = "O aluno não possui vínculo ativo com a sala informada";

    // Notas por critério distintas do resultado da fórmula: somar o mapa em vez de usar a US08 dá outro valor
    private final Map<UUID, Double> GRADES_BY_CRITERION = Map.of(CONTENT_UUID, 6.0);

    private TutoringSession session;
    private User student;

    @BeforeEach
    void setUp() {
        User tutor = new User();
        tutor.setId(TUTOR_UUID);
        tutor.setName("Tutor Responsável");

        Room room = new Room();
        room.setId(ROOM_UUID);
        room.setName("Módulo PBL 1");
        room.setTutor(tutor);

        Problem problem = new Problem();
        problem.setId(PROBLEM_UUID);
        problem.setTitle("Problema 1");
        problem.setRoom(room);

        // A posse é resolvida pelo caminho sessão → problema → sala → tutor, como na US09
        session = new TutoringSession();
        session.setId(SESSION_UUID);
        session.setProblem(problem);

        student = new User();
        student.setId(STUDENT_UUID);
        student.setName("Aluno Teste");
    }

    // --- ATRIBUIÇÃO ---

    @ParameterizedTest(name = "[{index}] papel {0}")
    @EnumSource(SessionRole.class)
    @DisplayName("Deve gravar o papel com a nota extra quando o papel está livre e o aluno é ativo na sala")
    void assignRole_FreeRoleToActiveStudent_SavesAssignmentWithExtraGrade(SessionRole role) {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        // O vínculo é conferido na sala da sessão, com a consulta da US06
        Mockito.when(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(ROOM_UUID, STUDENT_UUID)).thenReturn(true);
        Mockito.when(sessionRoleAssignmentRepository.existsBySessionIdAndRole(SESSION_UUID, role)).thenReturn(false);
        Mockito.when(sessionRoleAssignmentRepository.existsBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID)).thenReturn(false);
        Mockito.when(userRepository.findById(STUDENT_UUID)).thenReturn(Optional.of(student));
        // Simula o banco atribuindo o id: a resposta precisa ser montada a partir do que save devolve
        Mockito.when(sessionRoleAssignmentRepository.save(any(SessionRoleAssignment.class))).thenAnswer(i -> {
            SessionRoleAssignment saved = i.getArgument(0);
            saved.setId(ASSIGNMENT_UUID);
            return saved;
        });

        SessionRoleAssignmentResponse response = sessionRoleAssignmentService.assignRole(
                SESSION_UUID, role, new SessionRoleAssignmentRequest(STUDENT_UUID, 1.5), TUTOR_UUID);

        Mockito.verify(sessionRoleAssignmentRepository).save(assignmentCaptor.capture());
        SessionRoleAssignment captured = assignmentCaptor.getValue();
        assertEquals(SESSION_UUID, captured.getSession().getId());
        assertEquals(STUDENT_UUID, captured.getStudent().getId());
        assertEquals(role, captured.getRole());
        assertEquals(1.5, captured.getExtraGrade());

        assertEquals(ASSIGNMENT_UUID, response.getId());
        assertEquals(SESSION_UUID, response.getSessionId());
        assertEquals(STUDENT_UUID, response.getStudentId());
        // O nome não vem no payload: prova que a resposta foi montada a partir da entidade
        assertEquals("Aluno Teste", response.getStudentName());
        assertEquals(role, response.getRole());
        assertEquals(1.5, response.getExtraGrade());
    }

    // --- REGRA: APENAS UM ALUNO POR PAPEL POR SESSÃO ---

    @ParameterizedTest(name = "[{index}] papel {0}")
    @EnumSource(value = SessionRole.class, names = {"BOARD_SECRETARY", "TABLE_SECRETARY"})
    @DisplayName("[QA] Deve recusar com SessionRoleConflictException e não gravar quando o papel de Secretário já está com outro aluno na sessão")
    void assignRole_RoleAlreadyTakenInSession_ThrowsConflictAndSavesNothing(SessionRole role) {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        Mockito.when(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(ROOM_UUID, STUDENT_UUID)).thenReturn(true);
        Mockito.when(sessionRoleAssignmentRepository.existsBySessionIdAndRole(SESSION_UUID, role)).thenReturn(true);
        // lenient: o teste não impõe a ordem entre as duas checagens de unicidade
        Mockito.lenient().when(sessionRoleAssignmentRepository.existsBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID))
                .thenReturn(false);

        SessionRoleConflictException ex = assertThrows(SessionRoleConflictException.class,
                () -> sessionRoleAssignmentService.assignRole(
                        SESSION_UUID, role, new SessionRoleAssignmentRequest(STUDENT_UUID, 0.5), TUTOR_UUID));

        assertEquals(ROLE_TAKEN_MESSAGE, ex.getMessage());
        Mockito.verify(sessionRoleAssignmentRepository, Mockito.never()).save(any(SessionRoleAssignment.class));
    }

    @Test
    @DisplayName("Deve recusar com SessionRoleConflictException e não gravar quando o aluno já tem outro papel na sessão")
    void assignRole_StudentAlreadyHasRoleInSession_ThrowsConflictAndSavesNothing() {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        Mockito.when(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(ROOM_UUID, STUDENT_UUID)).thenReturn(true);
        // lenient: o teste não impõe a ordem entre as duas checagens de unicidade
        Mockito.lenient().when(sessionRoleAssignmentRepository.existsBySessionIdAndRole(SESSION_UUID, SessionRole.TABLE_SECRETARY))
                .thenReturn(false);
        Mockito.when(sessionRoleAssignmentRepository.existsBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID)).thenReturn(true);

        SessionRoleConflictException ex = assertThrows(SessionRoleConflictException.class,
                () -> sessionRoleAssignmentService.assignRole(
                        SESSION_UUID, SessionRole.TABLE_SECRETARY, new SessionRoleAssignmentRequest(STUDENT_UUID, 0.5), TUTOR_UUID));

        assertEquals(STUDENT_HAS_ROLE_MESSAGE, ex.getMessage());
        Mockito.verify(sessionRoleAssignmentRepository, Mockito.never()).save(any(SessionRoleAssignment.class));
    }

    // --- REGRA: O PAPEL VAI PARA UM ALUNO ATIVO DA SALA ---

    @Test
    @DisplayName("Deve lançar IllegalArgumentException e não gravar quando o aluno não tem vínculo ativo com a sala da sessão")
    void assignRole_ToStudentWithoutActiveLinkToSessionRoom_ThrowsIllegalArgumentAndSavesNothing() {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        // Vínculo inativo e aluno de outra sala dão false na mesma consulta, já testada na US06
        Mockito.when(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(ROOM_UUID, STUDENT_UUID)).thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> sessionRoleAssignmentService.assignRole(
                        SESSION_UUID, SessionRole.COORDINATOR, new SessionRoleAssignmentRequest(STUDENT_UUID, 1.0), TUTOR_UUID));

        assertEquals(NOT_ACTIVE_STUDENT_MESSAGE, ex.getMessage());
        Mockito.verify(sessionRoleAssignmentRepository, Mockito.never()).save(any(SessionRoleAssignment.class));
        // O vínculo é conferido antes de o aluno ser carregado, como na US06
        Mockito.verifyNoInteractions(userRepository);
    }

    // --- POSSE DA SALA ---

    @Test
    @DisplayName("Deve lançar SecurityException e não tocar nos papéis quando o usuário é tutor de outra sala")
    void assignRole_ByTutorOfAnotherRoom_ThrowsSecurityException() {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));

        SecurityException ex = assertThrows(SecurityException.class,
                () -> sessionRoleAssignmentService.assignRole(
                        SESSION_UUID, SessionRole.COORDINATOR, new SessionRoleAssignmentRequest(STUDENT_UUID, 1.0), OTHER_TUTOR_UUID));

        assertEquals(NOT_TUTOR_MESSAGE, ex.getMessage());
        // A posse é verificada antes de qualquer leitura de vínculo, de aluno ou de papel
        Mockito.verifyNoInteractions(sessionRoleAssignmentRepository, roomMemberRepository, userRepository);
    }

    // --- NOTA EXTRA SOMADA À FÓRMULA PADRÃO ---

    @ParameterizedTest(name = "[{index}] fórmula {0} + extra {1} -> {2}")
    @CsvSource({
            "7.5, 1.0, 8.5",
            // Teto da escala 0–10: a soma não pode passar de 10
            "9.5, 1.0, 10.0"
    })
    @DisplayName("Deve somar a nota extra do papel à nota da fórmula padrão, limitada a 10")
    void calculateSessionGrade_StudentWithRole_AddsExtraGradeCappedAtTen(double formulaGrade, double extraGrade, double expected) {
        Mockito.when(performanceTableService.calculateFinalGrade(TABLE_UUID, GRADES_BY_CRITERION)).thenReturn(formulaGrade);
        Mockito.when(sessionRoleAssignmentRepository.findBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID))
                .thenReturn(Optional.of(existingAssignment(SessionRole.COORDINATOR, extraGrade)));

        double grade = sessionRoleAssignmentService.calculateSessionGrade(
                SESSION_UUID, STUDENT_UUID, TABLE_UUID, GRADES_BY_CRITERION);

        assertEquals(expected, grade, 1e-9);
        // A base é a fórmula da US08, chamada com a tabela e as notas recebidas
        Mockito.verify(performanceTableService).calculateFinalGrade(TABLE_UUID, GRADES_BY_CRITERION);
    }

    @Test
    @DisplayName("Deve manter a nota da fórmula padrão quando o aluno não tem papel na sessão")
    void calculateSessionGrade_StudentWithoutRole_KeepsFormulaGrade() {
        Mockito.when(performanceTableService.calculateFinalGrade(TABLE_UUID, GRADES_BY_CRITERION)).thenReturn(7.5);
        Mockito.when(sessionRoleAssignmentRepository.findBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID))
                .thenReturn(Optional.empty());

        double grade = sessionRoleAssignmentService.calculateSessionGrade(
                SESSION_UUID, STUDENT_UUID, TABLE_UUID, GRADES_BY_CRITERION);

        assertEquals(7.5, grade, 1e-9);
    }

    // Helpers

    private SessionRoleAssignment existingAssignment(SessionRole role, double extraGrade) {
        SessionRoleAssignment assignment = new SessionRoleAssignment();
        assignment.setId(ASSIGNMENT_UUID);
        assignment.setSession(session);
        assignment.setStudent(student);
        assignment.setRole(role);
        assignment.setExtraGrade(extraGrade);
        return assignment;
    }
}
