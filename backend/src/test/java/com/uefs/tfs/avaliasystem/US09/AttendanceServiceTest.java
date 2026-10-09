package com.uefs.tfs.avaliasystem.US09;

import com.uefs.tfs.avaliasystem.dto.AttendanceRequest;
import com.uefs.tfs.avaliasystem.dto.AttendanceResponse;
import com.uefs.tfs.avaliasystem.model.Attendance;
import com.uefs.tfs.avaliasystem.model.AttendanceStatus;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.AttendanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

// Teste unitário puro: repositórios e relógio mockados, sem contexto Spring e sem banco
@ExtendWith(MockitoExtension.class)
@DisplayName("[US09] Service de registro de chamada")
class AttendanceServiceTest {

    @InjectMocks
    private AttendanceService attendanceService;

    @Mock
    private AttendanceRepository attendanceRepository;

    @Mock
    private TutoringSessionRepository tutoringSessionRepository;

    @Mock
    private UserRepository userRepository;

    // O horário vem do bean Clock (ClockConfig): mockado, o teste sabe exatamente qual instante esperar
    @Mock
    private Clock clock;

    @Captor
    private ArgumentCaptor<Attendance> attendanceCaptor;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID OTHER_TUTOR_UUID = UUID.fromString("444e4444-e44b-44d4-a444-444444444444");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-99d9-a999-999999999999");
    private final UUID ROOM_UUID = UUID.fromString("987e6543-e21b-12d3-a456-426614174000");
    private final UUID PROBLEM_UUID = UUID.fromString("555e5555-e55b-55d5-a555-555555555555");
    private final UUID SESSION_UUID = UUID.fromString("777e7777-e77b-77d7-a777-777777777777");
    private final UUID ATTENDANCE_UUID = UUID.fromString("333e3333-e33b-33d3-a333-333333333333");

    private final Instant EARLIER = Instant.parse("2026-10-07T17:55:00Z");
    private final Instant NOW = Instant.parse("2026-10-07T18:00:00Z");

    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode registrar a chamada.";

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

        // A posse é resolvida pelo caminho sessão → problema → sala → tutor
        session = new TutoringSession();
        session.setId(SESSION_UUID);
        session.setProblem(problem);

        student = new User();
        student.setId(STUDENT_UUID);
        student.setName("Aluno Teste");
    }

    // --- PRIMEIRO REGISTRO ---

    @ParameterizedTest(name = "[{index}] status {0}")
    @EnumSource(AttendanceStatus.class)
    @DisplayName("Deve criar o registro com o status escolhido e o horário do servidor quando o aluno ainda não tem presença na sessão")
    void registerAttendance_FirstTimeByRoomTutor_CreatesRecordWithServerTimestamp(AttendanceStatus status) {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        Mockito.when(attendanceRepository.findBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID)).thenReturn(Optional.empty());
        Mockito.when(userRepository.findById(STUDENT_UUID)).thenReturn(Optional.of(student));
        Mockito.when(clock.instant()).thenReturn(NOW);
        // Simula o banco atribuindo o id: a resposta precisa ser montada a partir do que save devolve
        Mockito.when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> {
            Attendance saved = i.getArgument(0);
            saved.setId(ATTENDANCE_UUID);
            return saved;
        });

        AttendanceResponse response = attendanceService.registerAttendance(
                SESSION_UUID, STUDENT_UUID, new AttendanceRequest(status), TUTOR_UUID);

        Mockito.verify(attendanceRepository).save(attendanceCaptor.capture());
        Attendance captured = attendanceCaptor.getValue();
        assertEquals(SESSION_UUID, captured.getSession().getId());
        assertEquals(STUDENT_UUID, captured.getStudent().getId());
        assertEquals(status, captured.getStatus());
        assertEquals(NOW, captured.getRecordedAt());

        assertEquals(ATTENDANCE_UUID, response.getId());
        assertEquals(SESSION_UUID, response.getSessionId());
        assertEquals(STUDENT_UUID, response.getStudentId());
        // O nome não vem no payload: prova que a resposta foi montada a partir da entidade
        assertEquals("Aluno Teste", response.getStudentName());
        assertEquals(status, response.getStatus());
        assertEquals(NOW, response.getRecordedAt());
    }

    // --- ALTERAÇÃO DE STATUS ---

    @Test
    @DisplayName("Deve alterar o status no registro existente e atualizar o horário para o instante da alteração")
    void registerAttendance_WhenRecordExists_UpdatesSameRecordAndRefreshesTimestamp() {
        Attendance existing = existingAttendance(AttendanceStatus.PRESENT, EARLIER);

        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        Mockito.when(attendanceRepository.findBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID)).thenReturn(Optional.of(existing));
        Mockito.when(clock.instant()).thenReturn(NOW);
        Mockito.when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

        AttendanceResponse response = attendanceService.registerAttendance(
                SESSION_UUID, STUDENT_UUID, new AttendanceRequest(AttendanceStatus.LATE), TUTOR_UUID);

        Mockito.verify(attendanceRepository).save(attendanceCaptor.capture());
        Attendance captured = attendanceCaptor.getValue();
        // Mesmo id: o registro foi alterado, e não recriado
        assertEquals(ATTENDANCE_UUID, captured.getId());
        assertEquals(AttendanceStatus.LATE, captured.getStatus());
        assertEquals(NOW, captured.getRecordedAt());
        // Sessão e aluno são imutáveis na alteração
        assertEquals(SESSION_UUID, captured.getSession().getId());
        assertEquals(STUDENT_UUID, captured.getStudent().getId());

        assertEquals(ATTENDANCE_UUID, response.getId());
        assertEquals(AttendanceStatus.LATE, response.getStatus());
        assertEquals(NOW, response.getRecordedAt());

        // Só a busca e a gravação do mesmo registro: exclui apagar e recriar ou um saveAll paralelo
        Mockito.verify(attendanceRepository).findBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID);
        Mockito.verifyNoMoreInteractions(attendanceRepository);
    }

    @Test
    @DisplayName("[QA] Deve manter o registro e o horário originais quando o mesmo status é reenviado após um timeout")
    void registerAttendance_SameStatusResentAfterTimeout_KeepsOriginalRecordAndTimestamp() {
        Attendance existing = existingAttendance(AttendanceStatus.PRESENT, EARLIER);

        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        Mockito.when(attendanceRepository.findBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID)).thenReturn(Optional.of(existing));
        // lenient: a implementação pode nem consultar o relógio nem gravar quando nada mudou
        Mockito.lenient().when(clock.instant()).thenReturn(NOW);
        Mockito.lenient().when(attendanceRepository.save(any(Attendance.class))).thenAnswer(i -> i.getArgument(0));

        AttendanceResponse response = attendanceService.registerAttendance(
                SESSION_UUID, STUDENT_UUID, new AttendanceRequest(AttendanceStatus.PRESENT), TUTOR_UUID);

        // Nenhum registro novo: além da busca, no máximo uma gravação, e só do registro que já existia
        Mockito.verify(attendanceRepository).findBySessionIdAndStudentId(SESSION_UUID, STUDENT_UUID);
        Mockito.verify(attendanceRepository, Mockito.atMost(1)).save(existing);
        Mockito.verifyNoMoreInteractions(attendanceRepository);
        // O reenvio não pode empurrar o horário real da presença para o momento do retry
        assertEquals(EARLIER, existing.getRecordedAt());
        assertEquals(AttendanceStatus.PRESENT, existing.getStatus());

        assertEquals(ATTENDANCE_UUID, response.getId());
        assertEquals(EARLIER, response.getRecordedAt());
    }

    // --- POSSE DA SALA ---

    @Test
    @DisplayName("Deve lançar SecurityException e não tocar nos registros quando o usuário é tutor de outra sala")
    void registerAttendance_ByTutorOfAnotherRoom_ThrowsSecurityException() {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));

        SecurityException ex = assertThrows(SecurityException.class,
                () -> attendanceService.registerAttendance(
                        SESSION_UUID, STUDENT_UUID, new AttendanceRequest(AttendanceStatus.ABSENT), OTHER_TUTOR_UUID));

        assertEquals(NOT_TUTOR_MESSAGE, ex.getMessage());
        // A posse é verificada antes de qualquer leitura ou escrita de presença
        Mockito.verifyNoInteractions(attendanceRepository, userRepository);
    }

    // Helpers

    private Attendance existingAttendance(AttendanceStatus status, Instant recordedAt) {
        Attendance attendance = new Attendance();
        attendance.setId(ATTENDANCE_UUID);
        attendance.setSession(session);
        attendance.setStudent(student);
        attendance.setStatus(status);
        attendance.setRecordedAt(recordedAt);
        return attendance;
    }
}
