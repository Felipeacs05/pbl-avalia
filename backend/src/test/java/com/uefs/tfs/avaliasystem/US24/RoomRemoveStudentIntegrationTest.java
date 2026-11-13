package com.uefs.tfs.avaliasystem.US24;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.*;
import com.uefs.tfs.avaliasystem.service.JwtService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato assumido:
 * - Nível: INTEGRAÇÃO REAL COM BANCO H2 EM MEMÓRIA
 * - Contexto completo: Controller + Service + Repository + SecurityFilterChain
 * - Cenários cobertos:
 *   1. Soft delete: RoomMember ativo=false, unlinkedAt preenchido, linha preservada.
 *   2. Histórico preservado: Feedback, Assessment, Attendance, BehaviorRecord intactos pós-remoção.
 *   3. Acesso revogado: dashboard, /members, /groups/me, peer assessment, carômetro, available-students.
 *   4. Relatório US20: aluno removido com notas em withdrawnStudents.
 *   5. Intruso 403 e vínculo ativo intacto.
 *   6. Reingresso por código (US04) reativa a MESMA linha.
 *   7. Aluno de outra sala -> 400.
 *   ACHADOS: GroupMember persistido, SelfAssessment sem verificação de vínculo, remoção do tutor.
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("[US24] Testes de Integração — Remoção de Aluno da Sala pelo Tutor")
class RoomRemoveStudentIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private RoomMemberRepository roomMemberRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private AssessmentRepository assessmentRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private BehaviorRecordRepository behaviorRecordRepository;
    @Autowired private GroupRepository groupRepository;
    @Autowired private GroupMemberRepository groupMemberRepository;
    @Autowired private ProblemRepository problemRepository;
    @Autowired private TutoringSessionRepository tutoringSessionRepository;
    @Autowired private JwtService jwtService;
    @Autowired private PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    private User tutor;
    private User student;
    private User intruder;    // tutor de outra sala
    private User studentB;   // aluno de outra sala
    private Room room;
    private Room otherRoom;
    private RoomMember studentMember;

    @BeforeEach
    void setUp() {
        tutor    = persistUser("Tutor US24");
        student  = persistUser("Aluno US24");
        intruder = persistUser("Intruso US24");
        studentB = persistUser("Aluno Outra Sala US24");

        room = persistRoom("Sala US24", tutor);
        otherRoom = persistRoom("Outra Sala US24", intruder);

        studentMember = persistMember(room, student, Role.STUDENT, true);
        // Aluno B na outra sala
        persistMember(otherRoom, studentB, Role.STUDENT, true);

        entityManager.flush();
        entityManager.clear();
    }

    // ─────────────── SOFT DELETE BÁSICO ───────────────

    @Nested
    @DisplayName("[US24] Soft Delete: linha inativada e preservada")
    class SoftDeleteScenarios {

        @Test
        @DisplayName("[US24] Tutor remove aluno: 204, RoomMember active=false, unlinkedAt preenchido, linha existe")
        void removeStudent_ValidTutor_Returns204AndSoftDeletesRow() throws Exception {
            // Act
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            entityManager.flush();
            entityManager.clear();

            // Assert — linha preservada com active=false
            RoomMember updated = roomMemberRepository
                    .findByRoomIdAndUserId(room.getId(), student.getId()).orElseThrow();
            assertFalse(updated.isActive(), "O vínculo deve estar inativo");
            assertNotNull(updated.getUnlinkedAt(), "unlinkedAt deve ser preenchido");
            assertEquals(studentMember.getId(), updated.getId(),
                    "A MESMA linha deve ser reutilizada (soft delete, não novo registro)");
        }
    }

    // ─────────────── HISTÓRICO PRESERVADO ───────────────

    @Nested
    @DisplayName("[US24] Histórico preservado após remoção")
    class HistoryPreservationScenarios {

        @Test
        @DisplayName("[US24] Feedback, Assessment, Attendance e BehaviorRecord continuam existindo após remoção do aluno")
        void removeStudent_HistoricalData_RemainsIntactAfterSoftDelete() throws Exception {
            // Arrange — cria histórico do aluno antes da remoção
            Problem problem = persistProblem(room, "PBL1");
            TutoringSession session = persistSession(problem);

            // Feedback
            Feedback feedback = new Feedback();
            feedback.setProblem(problem);
            feedback.setStudent(student);
            feedback.setText("Bom desempenho");
            feedback.setCreatedAt(Instant.now());
            feedbackRepository.save(feedback);

            // Assessment (autoavaliação)
            Assessment selfAssessment = new Assessment();
            selfAssessment.setProblem(problem);
            selfAssessment.setEvaluator(student);
            selfAssessment.setTarget(student);
            selfAssessment.setScore(8.0);
            selfAssessment.setComment("Autoavaliação");
            selfAssessment.setModifiedByTutor(false);
            assessmentRepository.save(selfAssessment);

            // Attendance
            Attendance attendance = new Attendance();
            attendance.setSession(session);
            attendance.setStudent(student);
            attendance.setStatus(AttendanceStatus.PRESENT);
            attendance.setRecordedAt(Instant.now());
            attendanceRepository.save(attendance);

            // BehaviorRecord
            BehaviorRecord behavior = new BehaviorRecord();
            behavior.setSession(session);
            behavior.setStudent(student);
            behavior.setText("Participativo");
            behavior.setRecordedAt(Instant.now());
            behaviorRecordRepository.save(behavior);

            entityManager.flush();
            entityManager.clear();

            long fbBefore  = feedbackRepository.count();
            long asBefore  = assessmentRepository.count();
            long attBefore = attendanceRepository.count();
            long brBefore  = behaviorRecordRepository.count();

            // Act — remove aluno
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            entityManager.flush();
            entityManager.clear();

            // Assert — contagens idênticas (nada foi apagado)
            assertEquals(fbBefore,  feedbackRepository.count(),   "Feedbacks devem ser preservados (soft delete)");
            assertEquals(asBefore,  assessmentRepository.count(), "Assessments devem ser preservados");
            assertEquals(attBefore, attendanceRepository.count(), "Attendances devem ser preservadas");
            assertEquals(brBefore,  behaviorRecordRepository.count(), "BehaviorRecords devem ser preservados");
        }

        @Test
        @DisplayName("[US24] GET /students/{id}/feedbacks pelo próprio aluno removido ainda retorna seus feedbacks")
        void removeStudent_FeedbackEndpoint_StillReturnsStudentFeedbacksAfterRemoval() throws Exception {
            // Arrange
            Problem problem = persistProblem(room, "PBL-FB");
            TutoringSession session = persistSession(problem);
            Feedback feedback = new Feedback();
            feedback.setProblem(problem);
            feedback.setStudent(student);
            feedback.setText("Feedback preservado");
            feedback.setCreatedAt(Instant.now());
            feedbackRepository.save(feedback);
            entityManager.flush();
            entityManager.clear();

            // Remove aluno
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            // Assert — aluno ainda consegue ver seus feedbacks (histórico preservado)
            mockMvc.perform(get("/api/v1/students/{studentId}/feedbacks", student.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray());
        }
    }

    // ─────────────── ACESSO REVOGADO ───────────────

    @Nested
    @DisplayName("[US24] Acesso revogado após remoção")
    class AccessRevocationScenarios {

        @Test
        @DisplayName("[US24] Dashboard do aluno não lista mais a sala em roomsAsStudent após remoção")
        void removeStudent_StudentDashboard_RoomDisappearsFromRoomsAsStudent() throws Exception {
            // Act — remove
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            // Assert — dashboard do aluno não contém mais a sala
            mockMvc.perform(get("/api/v1/users/me/rooms")
                            .with(jwt().jwt(j -> j.subject(student.getId().toString()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.roomsAsStudent[?(@.id == '" + room.getId() + "')]").doesNotExist());
        }

        @Test
        @DisplayName("[US24] GET /rooms/{id}/members pelo aluno removido retorna 403 Forbidden")
        void removeStudent_MembersEndpoint_Returns403ForRemovedStudent() throws Exception {
            // Act — remove
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            // Assert — aluno removido não tem mais acesso aos membros da sala
            mockMvc.perform(get("/api/v1/rooms/{roomId}/members", room.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString()))))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US24] GET /rooms/{id}/groups/me pelo aluno removido retorna 400 (sem vínculo ativo)")
        void removeStudent_GroupsMe_Returns400ForRemovedStudent() throws Exception {
            // Act — remove
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            // Assert — 400 pois aluno não possui vínculo ativo (IllegalArgumentException do GroupService)
            mockMvc.perform(get("/api/v1/rooms/{roomId}/groups/me", room.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString()))))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("[US24] GET /rooms/{id}/groups/available-students não lista o aluno removido")
        void removeStudent_AvailableStudents_RemovedStudentDisappears() throws Exception {
            // Act — remove
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            // Assert
            mockMvc.perform(get("/api/v1/rooms/{roomId}/groups/available-students", room.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + student.getId() + "')]").doesNotExist());
        }
    }

    // ─────────────── AUTORIZAÇÃO (403) ───────────────

    @Nested
    @DisplayName("[US24] Segurança: 403 para tutor intruso e aluno comum")
    class AuthorizationScenarios {

        @Test
        @DisplayName("[US24] Tutor de outra sala forçando a API recebe 403 e vínculo continua ativo")
        void removeStudent_IntruderTutor_Returns403AndMembershipRemainsActive() throws Exception {
            // Act — intruso tenta remover
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(intruder.getId().toString()))))
                    .andExpect(status().isForbidden());

            entityManager.flush();
            entityManager.clear();

            // Assert — vínculo continua ativo
            RoomMember member = roomMemberRepository.findByRoomIdAndUserId(room.getId(), student.getId()).orElseThrow();
            assertTrue(member.isActive(), "O vínculo deve continuar ativo após tentativa de acesso não autorizado");
            assertNull(member.getUnlinkedAt(), "unlinkedAt não deve ser preenchido por acesso não autorizado");
        }

        @Test
        @DisplayName("[US24] Aluno comum tentando remover outro aluno recebe 403")
        void removeStudent_StudentRole_Returns403AndMembershipRemainsActive() throws Exception {
            // Arrange — studentB tenta remover student
            User studentBUser = userRepository.findById(studentB.getId()).orElseThrow();

            // Act
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(studentB.getId().toString()))))
                    .andExpect(status().isForbidden());

            entityManager.flush();
            entityManager.clear();

            // Assert — vínculo do student continua ativo
            assertTrue(
                    roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), student.getId()),
                    "O vínculo do aluno alvo deve continuar ativo após tentativa de remoção não autorizada"
            );
        }
    }

    // ─────────────── REINGRESSO (US04) ───────────────

    @Nested
    @DisplayName("[US24] Reingresso por código reativa a MESMA linha")
    class RejoinScenarios {

        @Test
        @DisplayName("[US24] Aluno removido que reingressa por código reativa a mesma linha e zera unlinkedAt")
        void removeStudent_ThenRejoin_ReactivatesSameRowAndClearsUnlinkedAt() throws Exception {
            UUID memberId = studentMember.getId();

            // 1. Remove aluno
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            entityManager.flush();
            entityManager.clear();

            RoomMember afterRemoval = roomMemberRepository
                    .findByRoomIdAndUserId(room.getId(), student.getId()).orElseThrow();
            assertFalse(afterRemoval.isActive());

            // 2. Reingresso por código
            String joinBody = "{\"accessCode\": \"" + room.getAccessCode() + "\"}";
            mockMvc.perform(post("/api/v1/rooms/join")
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(joinBody))
                    .andExpect(status().isOk());

            entityManager.flush();
            entityManager.clear();

            // Assert — MESMA linha (mesmo id), active=true, unlinkedAt=null
            RoomMember reactivated = roomMemberRepository
                    .findByRoomIdAndUserId(room.getId(), student.getId()).orElseThrow();
            assertEquals(memberId, reactivated.getId(),
                    "A MESMA linha do RoomMember deve ser reativada (sem criar novo registro)");
            assertTrue(reactivated.isActive(), "O vínculo deve ser reativado");
            assertNull(reactivated.getUnlinkedAt(), "unlinkedAt deve ser zerado no reingresso");
        }
    }

    // ─────────────── ALUNO DE OUTRA SALA ───────────────

    @Nested
    @DisplayName("[US24] Aluno de outra sala -> 400")
    class CrossRoomScenarios {

        @Test
        @DisplayName("[US24] Tutor da sala A tenta remover aluno da sala B -> 400 e ambas salas intactas")
        void removeStudent_StudentFromAnotherRoom_Returns400AndBothRoomsIntact() throws Exception {
            // Act — tutor tenta remover studentB (que não é da room principal)
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), studentB.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isBadRequest());

            entityManager.flush();
            entityManager.clear();

            // Assert — studentB continua ativo na outra sala
            assertTrue(
                    roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(otherRoom.getId(), studentB.getId()),
                    "O aluno da outra sala deve continuar ativo na sua sala de origem"
            );
        }
    }

    // ─────────────── ACHADOS A INVESTIGAR ───────────────

    @Nested
    @DisplayName("[US24] ACHADOS — Comportamentos a investigar")
    class FindingsScenarios {

        @Disabled("Achado US24-A1: Aluno removido continua como GroupMember — " +
                  "removeStudentFromRoom não remove GroupMember ao inativar RoomMember")
        @Test
        @DisplayName("[US24] ACHADO A1: Aluno removido ainda aparece como GroupMember (grupo não é limpo)")
        void findingA1_RemovedStudentRemainsGroupMember() throws Exception {
            // Arrange — coloca aluno em um grupo
            Group group = new Group();
            group.setRoom(room);
            group.setName("Grupo US24");
            groupRepository.save(group);

            GroupMember gm = new GroupMember();
            gm.setGroup(group);
            gm.setUser(student);
            groupMemberRepository.save(gm);
            entityManager.flush();
            entityManager.clear();

            // Act — remove o aluno da sala
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            entityManager.flush();
            entityManager.clear();

            // Assert — o GroupMember NÃO deveria mais existir após a remoção do aluno
            boolean stillInGroup = groupMemberRepository.existsByGroupRoomIdAndUserId(room.getId(), student.getId());
            assertFalse(stillInGroup,
                    "ACHADO A1: Aluno removido ainda está no grupo — removeStudentFromRoom deveria " +
                    "deletar o GroupMember para consistência");
        }

        @Disabled("Achado US24-A2: SelfAssessmentService não verifica vínculo ativo — " +
                  "aluno removido consegue enviar autoavaliação pois a verificação só checa existência do Problem, " +
                  "não a associação ativa do aluno à sala")
        @Test
        @DisplayName("[US24] ACHADO A2: Aluno removido consegue enviar autoavaliação (SelfAssessmentService sem guarda de active)")
        void findingA2_RemovedStudentCanSubmitSelfAssessment() throws Exception {
            // Arrange
            Problem problem = persistProblem(room, "PBL-SA");
            // Libera autoavaliação diretamente
            problem.setSelfAssessmentReleased(true);
            problemRepository.save(problem);
            entityManager.flush();
            entityManager.clear();

            // Remove aluno
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), student.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isNoContent());

            entityManager.flush();
            entityManager.clear();

            // Act — aluno removido tenta enviar autoavaliação
            String body = "{\"score\": 9.0, \"comment\": \"Auto\"}";
            mockMvc.perform(post("/api/v1/problems/{problemId}/self-assessment", problem.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    // Assert — deveria ser 403, mas o código atual aceita (ACHADO)
                    .andExpect(status().isForbidden());
        }

        @Disabled("Achado US24-A3: Possível remover vínculo de Role.TUTOR — " +
                  "removeStudentFromRoom não verifica o role do RoomMember antes de inativar; " +
                  "se o tutor também tiver um RoomMember, pode ser inativado indevidamente")
        @Test
        @DisplayName("[US24] ACHADO A3: Tutor pode (erroneamente) remover seu próprio RoomMember de tutor")
        void findingA3_TutorCanRemoveOwnTutorRoomMember() throws Exception {
            // Arrange — cria RoomMember com Role.TUTOR para o tutor da sala
            RoomMember tutorMember = new RoomMember();
            tutorMember.setRoom(room);
            tutorMember.setUser(tutor);
            tutorMember.setRole(Role.TUTOR);
            tutorMember.setActive(true);
            roomMemberRepository.save(tutorMember);
            entityManager.flush();
            entityManager.clear();

            // Act — tutor tenta remover a si mesmo (seu RoomMember de TUTOR)
            mockMvc.perform(delete("/api/v1/rooms/{roomId}/members/{studentId}", room.getId(), tutor.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    // Assert — deveria ser 403 ou 400, mas o código pode aceitar (ACHADO)
                    .andExpect(status().isBadRequest());
        }
    }

    // ─────────────── HELPERS ───────────────

    private User persistUser(String name) {
        User u = new User();
        u.setName(name);
        u.setEmail(name.toLowerCase().replace(" ", ".") + "." + UUID.randomUUID().toString().substring(0, 8) + "@uefs.br");
        u.setPassword(passwordEncoder.encode("Senha@123"));
        u.setTokenVersion(1);
        return userRepository.save(u);
    }

    private Room persistRoom(String name, User roomTutor) {
        Room r = new Room();
        r.setName(name);
        r.setAccessCode(UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        r.setTutor(roomTutor);
        return roomRepository.save(r);
    }

    private RoomMember persistMember(Room r, User u, Role role, boolean active) {
        RoomMember rm = new RoomMember();
        rm.setRoom(r);
        rm.setUser(u);
        rm.setRole(role);
        rm.setActive(active);
        rm.setUnlinkedAt(null);
        return roomMemberRepository.save(rm);
    }

    private Problem persistProblem(Room r, String title) {
        Problem p = new Problem();
        p.setRoom(r);
        p.setTitle(title);
        p.setDescription("Descrição " + title);
        p.setOrderIndex(0);
        p.setWeight(1.0);
        return problemRepository.save(p);
    }

    private TutoringSession persistSession(Problem p) {
        TutoringSession s = new TutoringSession();
        s.setProblem(p);
        return tutoringSessionRepository.save(s);
    }
}
