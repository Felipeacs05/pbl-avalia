package com.uefs.tfs.avaliasystem.US09;

import com.uefs.tfs.avaliasystem.model.Attendance;
import com.uefs.tfs.avaliasystem.model.AttendanceStatus;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Fatia de persistência apenas (H2 em memória, sem servidor web); cada teste sofre rollback
@DataJpaTest
@DisplayName("[US09] Repository de registro de chamada")
class AttendanceRepositoryTest {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private TestEntityManager entityManager;

    private final Instant RECORDED_AT = Instant.parse("2026-10-07T18:00:00Z");

    private User tutor;
    private User student;
    private TutoringSession session;

    // Tutor, Sala, Problema e Sessão precisam existir fisicamente para satisfazer as chaves estrangeiras
    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor Chamada");
        student = persistUser("Aluno Chamada");
        session = persistSession(persistRoom("Sala da Chamada"));
    }

    // --- GRAVAÇÃO ---

    @Test
    @DisplayName("Deve gravar a presença ligada à sessão e ao aluno, com status e horário")
    void save_PersistsAttendanceLinkedToSessionAndStudent_AndSurvivesContextClear() {
        UUID savedId = attendanceRepository.save(
                newAttendance(session, student, AttendanceStatus.LATE, RECORDED_AT)).getId();

        // Força a leitura abaixo a ir ao banco, e não ao contexto de persistência
        entityManager.flush();
        entityManager.clear();

        Attendance found = attendanceRepository.findById(savedId).orElseThrow();
        assertEquals(session.getId(), found.getSession().getId());
        assertEquals(student.getId(), found.getStudent().getId());
        assertEquals(AttendanceStatus.LATE, found.getStatus());
        assertEquals(RECORDED_AT, found.getRecordedAt());
    }

    // --- BUSCA DO REGISTRO DO ALUNO NA SESSÃO ---

    @Test
    @DisplayName("Deve encontrar apenas o registro do aluno na sessão informada")
    void findBySessionIdAndStudentId_ReturnsOnlyRecordOfThatStudentInThatSession() {
        User otherStudent = persistUser("Outro Aluno");
        TutoringSession otherSession = persistSession(persistRoom("Outra Sala"));

        // Mesmo aluno em outra sessão e outro aluno na mesma sessão: nenhum dos dois pode ser devolvido
        Attendance target = persistAttendance(session, student, AttendanceStatus.PRESENT);
        persistAttendance(otherSession, student, AttendanceStatus.ABSENT);
        persistAttendance(session, otherStudent, AttendanceStatus.JUSTIFIED_ABSENCE);
        entityManager.clear();

        Optional<Attendance> found = attendanceRepository.findBySessionIdAndStudentId(session.getId(), student.getId());

        assertTrue(found.isPresent());
        assertEquals(target.getId(), found.get().getId());
        assertEquals(AttendanceStatus.PRESENT, found.get().getStatus());
    }

    // --- ALTERAÇÃO DE STATUS ---

    @Test
    @DisplayName("Deve atualizar o status na mesma linha, sem criar um segundo registro")
    void save_WhenStatusChanges_UpdatesSameRowWithoutCreatingAnother() {
        UUID originalId = persistAttendance(session, student, AttendanceStatus.PRESENT).getId();
        entityManager.clear();

        Instant changedAt = RECORDED_AT.plusSeconds(300);
        Attendance loaded = attendanceRepository.findById(originalId).orElseThrow();
        loaded.setStatus(AttendanceStatus.LATE);
        loaded.setRecordedAt(changedAt);
        attendanceRepository.save(loaded);

        entityManager.flush();
        entityManager.clear();

        assertEquals(1, attendanceRepository.count());
        Attendance reread = attendanceRepository.findById(originalId).orElseThrow();
        assertEquals(AttendanceStatus.LATE, reread.getStatus());
        assertEquals(changedAt, reread.getRecordedAt());
    }

    @Test
    @DisplayName("[QA] Deve recusar um segundo registro do mesmo aluno na mesma sessão")
    void saveAndFlush_DuplicateStudentInSameSession_ThrowsDataIntegrityViolation() {
        persistAttendance(session, student, AttendanceStatus.PRESENT);

        // Duas requisições concorrentes (ex.: reenvio após timeout) não podem gerar duas linhas
        Attendance duplicate = newAttendance(session, student, AttendanceStatus.PRESENT, RECORDED_AT.plusSeconds(5));

        assertThrows(DataIntegrityViolationException.class, () -> attendanceRepository.saveAndFlush(duplicate));
    }

    // Helpers

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único
        user.setEmail("us09_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        user.setPassword("senha123");
        return entityManager.persistFlushFind(user);
    }

    private Room persistRoom(String name) {
        String code = UUID.randomUUID().toString().substring(0, 5);
        Room room = new Room();
        room.setName(name);
        room.setAccessCode(code);
        room.setInviteLink("app/join/" + code);
        room.setTutor(tutor);
        return entityManager.persistFlushFind(room);
    }

    private TutoringSession persistSession(Room room) {
        Problem problem = new Problem();
        problem.setTitle("Problema 1");
        problem.setRoom(room);
        problem.setCreatedAt(RECORDED_AT.minusSeconds(86400));
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);
        problem = entityManager.persistFlushFind(problem);

        TutoringSession newSession = new TutoringSession();
        newSession.setProblem(problem);
        return entityManager.persistFlushFind(newSession);
    }

    private Attendance newAttendance(TutoringSession targetSession, User targetStudent,
                                     AttendanceStatus status, Instant recordedAt) {
        Attendance attendance = new Attendance();
        attendance.setSession(targetSession);
        attendance.setStudent(targetStudent);
        attendance.setStatus(status);
        attendance.setRecordedAt(recordedAt);
        return attendance;
    }

    private Attendance persistAttendance(TutoringSession targetSession, User targetStudent, AttendanceStatus status) {
        return entityManager.persistFlushFind(newAttendance(targetSession, targetStudent, status, RECORDED_AT));
    }
}
