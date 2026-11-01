package com.uefs.tfs.avaliasystem.e2e;

import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@Profile("e2e")
@RequestMapping("/api/e2e")
public class E2eSeedController {

    static final int CLASS_SIZE = 40;
    static final double ORIGINAL_GRADE = 7.0;

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final ProblemRepository problemRepository;
    private final TutoringSessionRepository tutoringSessionRepository;
    private final PerformanceTableRepository performanceTableRepository;
    private final AssessmentRepository assessmentRepository;
    private final PasswordEncoder passwordEncoder;

    public E2eSeedController(UserRepository userRepository,
                             RoomRepository roomRepository,
                             RoomMemberRepository roomMemberRepository,
                             ProblemRepository problemRepository,
                             TutoringSessionRepository tutoringSessionRepository,
                             PerformanceTableRepository performanceTableRepository,
                             AssessmentRepository assessmentRepository,
                             PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.roomMemberRepository = roomMemberRepository;
        this.problemRepository = problemRepository;
        this.tutoringSessionRepository = tutoringSessionRepository;
        this.performanceTableRepository = performanceTableRepository;
        this.assessmentRepository = assessmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/seed")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, String> seed() {
        String run = UUID.randomUUID().toString().substring(0, 8);
        String password = passwordEncoder.encode("e2e-" + run);

        User tutor = user("Tutora E2E " + run, "tutor", run, password);
        User otherTutor = user("Outro Tutor E2E " + run, "other-tutor", run, password);

        Room room = room("Sala E2E " + run, tutor);
        room("Outra Sala E2E " + run, otherTutor);

        User student = user("Ana E2E " + run, "student-a", run, password);
        User otherStudent = user("Bruno E2E " + run, "student-b", run, password);
        enroll(room, student);
        enroll(room, otherStudent);
        for (int i = 3; i <= CLASS_SIZE; i++) {
            String index = String.format("%02d", i);
            enroll(room, user("Aluno E2E " + index + " " + run, "student-" + index, run, password));
        }

        Problem problem = new Problem();
        problem.setRoom(room);
        problem.setTitle("Problema E2E " + run);
        problem.setOrderIndex(0);
        problem.setCreatedAt(Instant.now());
        problem = problemRepository.save(problem);

        TutoringSession session = new TutoringSession();
        session.setProblem(problem);
        session = tutoringSessionRepository.save(session);

        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela E2E " + run);
        table.setRoom(room);
        table.getCriteriaList().add(criterion(table, "Conteúdo", 0.4));
        table.getCriteriaList().add(criterion(table, "Participação", 0.3));
        table.getCriteriaList().add(criterion(table, "Autoavaliação", 0.3));
        table = performanceTableRepository.save(table);

        Assessment selfAssessment = new Assessment();
        selfAssessment.setProblem(problem);
        selfAssessment.setEvaluator(student);
        selfAssessment.setTarget(student);
        selfAssessment.setScore(ORIGINAL_GRADE);
        selfAssessment.setComment("Autoavaliação E2E " + run);
        selfAssessment = assessmentRepository.save(selfAssessment);

        Map<String, String> env = new LinkedHashMap<>();
        env.put("E2E_USER_ID", tutor.getId().toString());
        env.put("E2E_TUTOR_ID", tutor.getId().toString());
        env.put("E2E_TUTOR_NAME", tutor.getName());
        env.put("E2E_OTHER_TUTOR_ID", otherTutor.getId().toString());
        env.put("E2E_ROOM_ID", room.getId().toString());
        env.put("E2E_PROBLEM_ID", problem.getId().toString());
        env.put("E2E_SESSION_ID", session.getId().toString());
        env.put("E2E_PERFORMANCE_TABLE_ID", table.getId().toString());
        env.put("E2E_ASSESSMENT_ID", selfAssessment.getId().toString());
        env.put("E2E_ORIGINAL_GRADE", String.valueOf(ORIGINAL_GRADE));
        env.put("E2E_STUDENT_ID", student.getId().toString());
        env.put("E2E_STUDENT_NAME", student.getName());
        env.put("E2E_OTHER_STUDENT_ID", otherStudent.getId().toString());
        env.put("E2E_OTHER_STUDENT_NAME", otherStudent.getName());
        return env;
    }

    private User user(String name, String handle, String run, String password) {
        User user = new User();
        user.setName(name);
        user.setEmail("e2e+" + run + "-" + handle + "@avalia.test");
        user.setPassword(password);
        return userRepository.save(user);
    }

    private Room room(String name, User tutor) {
        String accessCode = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        Room room = new Room();
        room.setName(name);
        room.setAccessCode(accessCode);
        room.setInviteLink("app/join/" + accessCode);
        room.setTutor(tutor);
        return roomRepository.save(room);
    }

    private void enroll(Room room, User student) {
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(student);
        member.setRole(Role.STUDENT);
        member.setActive(true);
        roomMemberRepository.save(member);
    }

    private Criterion criterion(PerformanceTable table, String name, double weight) {
        Criterion criterion = new Criterion();
        criterion.setName(name);
        criterion.setWeight(weight);
        criterion.setPerformanceTable(table);
        return criterion;
    }
}
