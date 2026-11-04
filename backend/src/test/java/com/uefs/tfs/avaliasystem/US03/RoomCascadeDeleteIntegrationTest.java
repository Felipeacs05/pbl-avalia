package com.uefs.tfs.avaliasystem.US03;

import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Attendance;
import com.uefs.tfs.avaliasystem.model.AttendanceStatus;
import com.uefs.tfs.avaliasystem.model.BehaviorRecord;
import com.uefs.tfs.avaliasystem.model.BehaviorTag;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Group;
import com.uefs.tfs.avaliasystem.model.GroupMember;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import com.uefs.tfs.avaliasystem.model.Team;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.AttendanceRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorRecordRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorTagRepository;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.GroupMemberRepository;
import com.uefs.tfs.avaliasystem.repository.GroupRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
import com.uefs.tfs.avaliasystem.repository.TeamRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
class RoomCascadeDeleteIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private RoomMemberRepository roomMemberRepository;

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private GroupMemberRepository groupMemberRepository;

    @Autowired
    private PerformanceTableRepository performanceTableRepository;

    @Autowired
    private CriterionRepository criterionRepository;

    @Autowired
    private BehaviorTagRepository behaviorTagRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private TutoringSessionRepository tutoringSessionRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private SessionRoleAssignmentRepository sessionRoleAssignmentRepository;

    @Autowired
    private BehaviorRecordRepository behaviorRecordRepository;

    @Autowired
    private AssessmentRepository assessmentRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Test
    @DisplayName("DELETE /api/v1/rooms/{id} deve apagar em cascata as entidades vinculadas à sala mantendo os usuários intactos")
    void deleteRoom_WithAllDependencies_DeletesCascadeAndPreservesUsers() throws Exception {
        User tutor = new User();
        tutor.setName("Tutor Teste");
        tutor.setEmail("tutor-cascade@test.com");
        tutor.setPassword("senha123");
        tutor = userRepository.save(tutor);
        String tutorId = tutor.getId().toString();

        User student = new User();
        student.setName("Aluno Teste");
        student.setEmail("aluno-cascade@test.com");
        student.setPassword("senha123");
        student = userRepository.save(student);

        Room room = new Room();
        room.setName("Sala Completa");
        room.setAccessCode("CASC01");
        room.setInviteLink("app/join/CASC01");
        room.setTutor(tutor);
        room = roomRepository.save(room);

        Team team = new Team();
        team.setName("Time A");
        team.setRoom(room);
        team = teamRepository.save(team);

        RoomMember roomMember = new RoomMember();
        roomMember.setRoom(room);
        roomMember.setUser(student);
        roomMember.setRole(Role.STUDENT);
        roomMember.setActive(true);
        roomMember.setTeam(team);
        roomMember = roomMemberRepository.save(roomMember);

        Group group = new Group();
        group.setName("Grupo 1");
        group.setRoom(room);
        group = groupRepository.save(group);

        GroupMember groupMember = new GroupMember();
        groupMember.setGroup(group);
        groupMember.setUser(student);
        groupMember = groupMemberRepository.save(groupMember);
        group.getMembers().add(groupMember);

        PerformanceTable roomTable = new PerformanceTable();
        roomTable.setName("Tabela da Sala");
        roomTable.setRoom(room);
        Criterion roomCriterion = new Criterion();
        roomCriterion.setName("Participação");
        roomCriterion.setWeight(1.0);
        roomCriterion.setPerformanceTable(roomTable);
        roomTable.getCriteriaList().add(roomCriterion);
        roomTable = performanceTableRepository.save(roomTable);
        roomCriterion = roomTable.getCriteriaList().get(0);

        BehaviorTag behaviorTag = new BehaviorTag();
        behaviorTag.setRoom(room);
        behaviorTag.setName("Proativo");
        behaviorTag = behaviorTagRepository.save(behaviorTag);

        Problem problem = new Problem();
        problem.setRoom(room);
        problem.setTitle("Problema 1");
        problem.setCreatedAt(Instant.now());
        problem = problemRepository.save(problem);

        PerformanceTable problemTable = new PerformanceTable();
        problemTable.setName("Tabela do Problema");
        problemTable.setProblem(problem);
        Criterion problemCriterion = new Criterion();
        problemCriterion.setName("Entrega");
        problemCriterion.setWeight(1.0);
        problemCriterion.setPerformanceTable(problemTable);
        problemTable.getCriteriaList().add(problemCriterion);
        problemTable = performanceTableRepository.save(problemTable);
        problemCriterion = problemTable.getCriteriaList().get(0);

        TutoringSession session = new TutoringSession();
        session.setProblem(problem);
        session = tutoringSessionRepository.save(session);

        Attendance attendance = new Attendance();
        attendance.setSession(session);
        attendance.setStudent(student);
        attendance.setStatus(AttendanceStatus.PRESENT);
        attendance.setRecordedAt(Instant.now());
        attendance = attendanceRepository.save(attendance);

        SessionRoleAssignment roleAssignment = new SessionRoleAssignment();
        roleAssignment.setSession(session);
        roleAssignment.setStudent(student);
        roleAssignment.setRole(SessionRole.COORDINATOR);
        roleAssignment.setExtraGrade(0.5);
        roleAssignment = sessionRoleAssignmentRepository.save(roleAssignment);

        BehaviorRecord behaviorRecord = new BehaviorRecord();
        behaviorRecord.setSession(session);
        behaviorRecord.setStudent(student);
        behaviorRecord.setTag(behaviorTag);
        behaviorRecord.setText("Excelente participação");
        behaviorRecord.setRecordedAt(Instant.now());
        behaviorRecord = behaviorRecordRepository.save(behaviorRecord);

        Assessment assessment = new Assessment();
        assessment.setProblem(problem);
        assessment.setEvaluator(student);
        assessment.setTarget(student);
        assessment.setScore(9.5);
        assessment.setComment("Autoavaliação");
        assessment = assessmentRepository.save(assessment);

        Feedback feedback = new Feedback();
        feedback.setProblem(problem);
        feedback.setSession(session);
        feedback.setStudent(student);
        feedback.setGrade(9.0);
        feedback.setText("Bom trabalho");
        feedback = feedbackRepository.save(feedback);

        entityManager.flush();

        mockMvc.perform(delete("/api/v1/rooms/{id}", room.getId())
                        .with(jwt().jwt(j -> j.subject(tutorId))))
                .andExpect(status().isNoContent());

        entityManager.flush();
        entityManager.clear();

        // Verifica que a sala e todas as entidades dependentes foram apagadas
        assertFalse(roomRepository.existsById(room.getId()));
        assertFalse(teamRepository.existsById(team.getId()));
        assertFalse(roomMemberRepository.existsById(roomMember.getId()));
        assertFalse(groupRepository.existsById(group.getId()));
        assertFalse(groupMemberRepository.existsById(groupMember.getId()));
        assertFalse(performanceTableRepository.existsById(roomTable.getId()));
        assertFalse(criterionRepository.existsById(roomCriterion.getId()));
        assertFalse(behaviorTagRepository.existsById(behaviorTag.getId()));
        assertFalse(problemRepository.existsById(problem.getId()));
        assertFalse(performanceTableRepository.existsById(problemTable.getId()));
        assertFalse(criterionRepository.existsById(problemCriterion.getId()));
        assertFalse(tutoringSessionRepository.existsById(session.getId()));
        assertFalse(attendanceRepository.existsById(attendance.getId()));
        assertFalse(sessionRoleAssignmentRepository.existsById(roleAssignment.getId()));
        assertFalse(behaviorRecordRepository.existsById(behaviorRecord.getId()));
        assertFalse(assessmentRepository.existsById(assessment.getId()));
        assertFalse(feedbackRepository.existsById(feedback.getId()));

        // Verifica que os usuários (tutor e aluno) permanecem intactos no banco
        assertTrue(userRepository.existsById(tutor.getId()));
        assertTrue(userRepository.existsById(student.getId()));
    }
}
