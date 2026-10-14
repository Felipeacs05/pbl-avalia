package com.uefs.tfs.avaliasystem.US10;

import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
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
@DisplayName("[US10] Repository de papéis da sessão")
class SessionRoleAssignmentRepositoryTest {

    @Autowired
    private SessionRoleAssignmentRepository sessionRoleAssignmentRepository;

    @Autowired
    private TestEntityManager entityManager;

    private final Instant CREATED_AT = Instant.parse("2026-10-07T18:00:00Z");

    private User tutor;
    private User student;
    private User otherStudent;
    private Room room;
    private TutoringSession session;

    // Tutor, Sala, Problema e Sessão precisam existir fisicamente para satisfazer as chaves estrangeiras
    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor Papéis");
        student = persistUser("Aluno Papéis");
        otherStudent = persistUser("Outro Aluno Papéis");
        room = persistRoom("Sala dos Papéis");
        session = persistSession(room);
    }

    // --- GRAVAÇÃO ---

    @Test
    @DisplayName("Deve gravar o papel ligado à sessão e ao aluno, com a nota extra")
    void save_PersistsAssignmentLinkedToSessionAndStudent_AndSurvivesContextClear() {
        UUID savedId = sessionRoleAssignmentRepository.save(
                newAssignment(session, student, SessionRole.COORDINATOR, 1.5)).getId();

        // Força a leitura abaixo a ir ao banco, e não ao contexto de persistência
        entityManager.flush();
        entityManager.clear();

        SessionRoleAssignment found = sessionRoleAssignmentRepository.findById(savedId).orElseThrow();
        assertEquals(session.getId(), found.getSession().getId());
        assertEquals(student.getId(), found.getStudent().getId());
        assertEquals(SessionRole.COORDINATOR, found.getRole());
        assertEquals(1.5, found.getExtraGrade());
    }

    // --- UNICIDADE: UM ALUNO POR PAPEL E UM PAPEL POR ALUNO, POR SESSÃO ---

    @Test
    @DisplayName("[QA] Deve recusar no banco o papel de Secretário atribuído a dois alunos na mesma sessão")
    void saveAndFlush_SameRoleForTwoStudentsInSameSession_ThrowsDataIntegrityViolation() {
        persistAssignment(session, student, SessionRole.BOARD_SECRETARY);

        // Duas requisições simultâneas passam juntas pela checagem do Service: só a constraint garante a regra
        SessionRoleAssignment duplicate = newAssignment(session, otherStudent, SessionRole.BOARD_SECRETARY, 0.5);

        assertThrows(DataIntegrityViolationException.class,
                () -> sessionRoleAssignmentRepository.saveAndFlush(duplicate));
    }

    @Test
    @DisplayName("Deve recusar no banco um segundo papel para o mesmo aluno na mesma sessão")
    void saveAndFlush_SecondRoleForSameStudentInSameSession_ThrowsDataIntegrityViolation() {
        persistAssignment(session, student, SessionRole.COORDINATOR);

        SessionRoleAssignment secondRole = newAssignment(session, student, SessionRole.TABLE_SECRETARY, 0.5);

        assertThrows(DataIntegrityViolationException.class,
                () -> sessionRoleAssignmentRepository.saveAndFlush(secondRole));
    }

    @Test
    @DisplayName("Deve aceitar os três papéis com alunos distintos na sessão e o mesmo papel em outra sessão")
    void saveAndFlush_DistinctRolesInSessionAndSameRoleInAnotherSession_AreAccepted() {
        // Controle positivo: as constraints acima não podem ser mais largas que a regra "por papel, por sessão"
        User thirdStudent = persistUser("Terceiro Aluno Papéis");
        TutoringSession otherSession = persistSession(room);

        sessionRoleAssignmentRepository.saveAndFlush(newAssignment(session, student, SessionRole.COORDINATOR, 1.0));
        sessionRoleAssignmentRepository.saveAndFlush(newAssignment(session, otherStudent, SessionRole.BOARD_SECRETARY, 0.5));
        sessionRoleAssignmentRepository.saveAndFlush(newAssignment(session, thirdStudent, SessionRole.TABLE_SECRETARY, 0.5));
        // O mesmo aluno com o mesmo papel, mas na sessão seguinte
        sessionRoleAssignmentRepository.saveAndFlush(newAssignment(otherSession, student, SessionRole.COORDINATOR, 1.0));

        assertEquals(4, sessionRoleAssignmentRepository.count());
    }

    // --- CONSULTAS USADAS PELO SERVICE ---

    @Test
    @DisplayName("Deve indicar papel ocupado e aluno com papel apenas na sessão informada")
    void existsQueries_ConsiderOnlyTheGivenSession() {
        TutoringSession otherSession = persistSession(room);
        // Dados de outra sessão não podem bloquear a sessão consultada
        persistAssignment(otherSession, student, SessionRole.BOARD_SECRETARY);
        persistAssignment(session, otherStudent, SessionRole.COORDINATOR);
        entityManager.clear();

        assertTrue(sessionRoleAssignmentRepository.existsBySessionIdAndRole(session.getId(), SessionRole.COORDINATOR));
        assertFalse(sessionRoleAssignmentRepository.existsBySessionIdAndRole(session.getId(), SessionRole.BOARD_SECRETARY));

        assertTrue(sessionRoleAssignmentRepository.existsBySessionIdAndStudentId(session.getId(), otherStudent.getId()));
        assertFalse(sessionRoleAssignmentRepository.existsBySessionIdAndStudentId(session.getId(), student.getId()));
    }

    @Test
    @DisplayName("Deve encontrar apenas o papel do aluno na sessão informada")
    void findBySessionIdAndStudentId_ReturnsOnlyAssignmentOfThatStudentInThatSession() {
        TutoringSession otherSession = persistSession(room);

        // Mesmo aluno em outra sessão e outro aluno na mesma sessão: nenhum dos dois pode ser devolvido
        SessionRoleAssignment target = persistAssignment(session, student, SessionRole.TABLE_SECRETARY);
        persistAssignment(otherSession, student, SessionRole.COORDINATOR);
        persistAssignment(session, otherStudent, SessionRole.COORDINATOR);
        entityManager.clear();

        Optional<SessionRoleAssignment> found =
                sessionRoleAssignmentRepository.findBySessionIdAndStudentId(session.getId(), student.getId());

        assertTrue(found.isPresent());
        assertEquals(target.getId(), found.get().getId());
        assertEquals(SessionRole.TABLE_SECRETARY, found.get().getRole());
    }

    // Helpers

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único
        user.setEmail("us10_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        user.setPassword("senha123");
        return entityManager.persistFlushFind(user);
    }

    private Room persistRoom(String name) {
        String code = UUID.randomUUID().toString().substring(0, 5);
        Room newRoom = new Room();
        newRoom.setName(name);
        newRoom.setAccessCode(code);
        newRoom.setInviteLink("app/join/" + code);
        newRoom.setTutor(tutor);
        return entityManager.persistFlushFind(newRoom);
    }

    private TutoringSession persistSession(Room targetRoom) {
        Problem problem = new Problem();
        problem.setTitle("Problema 1");
        problem.setRoom(targetRoom);
        problem.setCreatedAt(CREATED_AT.minusSeconds(86400));
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);
        problem = entityManager.persistFlushFind(problem);

        TutoringSession newSession = new TutoringSession();
        newSession.setProblem(problem);
        return entityManager.persistFlushFind(newSession);
    }

    private SessionRoleAssignment newAssignment(TutoringSession targetSession, User targetStudent,
                                                SessionRole role, double extraGrade) {
        SessionRoleAssignment assignment = new SessionRoleAssignment();
        assignment.setSession(targetSession);
        assignment.setStudent(targetStudent);
        assignment.setRole(role);
        assignment.setExtraGrade(extraGrade);
        return assignment;
    }

    private SessionRoleAssignment persistAssignment(TutoringSession targetSession, User targetStudent, SessionRole role) {
        return entityManager.persistFlushFind(newAssignment(targetSession, targetStudent, role, 1.0));
    }
}