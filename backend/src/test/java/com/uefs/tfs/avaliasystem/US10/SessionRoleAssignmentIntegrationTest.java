package com.uefs.tfs.avaliasystem.US10;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.SessionRoleAssignmentRequest;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.SessionRoleAssignmentRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.SessionRoleAssignmentService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// NÍVEL: INTEGRAÇÃO. Sobe o contexto inteiro: Controller, Service e Repository reais com H2 via MockMvc.
// Objetivo: a cola entre as camadas (sala da sessão usada no vínculo, exceção -> status, unicidade no banco real,
// nota extra gravada via PUT usada no cálculo junto com a fórmula da US08).
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("[US10] Integração de papéis da sessão")
class SessionRoleAssignmentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SessionRoleAssignmentService sessionRoleAssignmentService;

    @Autowired
    private SessionRoleAssignmentRepository sessionRoleAssignmentRepository;

    @Autowired
    private TutoringSessionRepository tutoringSessionRepository;

    @Autowired
    private PerformanceTableRepository performanceTableRepository;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    // Usado no flush/clear e para o vínculo RoomMember, como na US03 e na US09
    @PersistenceContext
    private EntityManager entityManager;

    private static final String ROUTE = "/api/v1/sessions/{sessionId}/roles/{role}";
    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode atribuir papéis da sessão.";
    private static final String ROLE_TAKEN_MESSAGE = "Este papel já foi atribuído a outro aluno nesta sessão.";
    private static final String STUDENT_HAS_ROLE_MESSAGE = "Este aluno já possui um papel nesta sessão.";
    private static final String NOT_ACTIVE_STUDENT_MESSAGE = "O aluno não possui vínculo ativo com a sala informada";

    private final Instant CREATED_AT = Instant.parse("2026-10-07T12:00:00Z");

    private User tutor;
    private User student;
    private User otherStudent;
    private Room room;
    private TutoringSession session;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor Integração");
        student = persistUser("Aluno Integração");
        otherStudent = persistUser("Outro Aluno Integração");
        room = persistRoom("Sala dos Papéis", tutor);
        persistStudentMember(room, student);
        persistStudentMember(room, otherStudent);
        session = persistSession(room);
        entityManager.flush();
        // Sem isto o Service recebe a entidade do cache; limpando, ele carrega do H2 como em produção
        entityManager.clear();
    }

    private RequestPostProcessor authenticatedAs(String userId) {
        return jwt().jwt(j -> j.subject(userId));
    }

    // --- ATRIBUIÇÃO ---

    @ParameterizedTest(name = "[{index}] papel {0}")
    @EnumSource(SessionRole.class)
    @DisplayName("Deve gravar o papel com a nota extra pelas três camadas e responder com os dados lidos do banco")
    void assignRole_ThroughFullStack_PersistsAssignmentAndReturnsIt(SessionRole role) throws Exception {
        String responseBody = putRole(tutor, role, student, 1.5)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").value(session.getId().toString()))
                .andExpect(jsonPath("$.studentId").value(student.getId().toString()))
                // O nome não vem no payload: prova que a resposta foi montada a partir do banco
                .andExpect(jsonPath("$.studentName").value("Aluno Integração"))
                .andExpect(jsonPath("$.role").value(role.name()))
                .andExpect(jsonPath("$.extraGrade").value(1.5))
                .andReturn().getResponse().getContentAsString();

        entityManager.flush();
        entityManager.clear();

        SessionRoleAssignment persisted = assignmentOf(student);
        // O id devolvido é uma linha real do banco
        assertEquals(UUID.fromString(objectMapper.readTree(responseBody).get("id").asString()), persisted.getId());
        assertEquals(role, persisted.getRole());
        assertEquals(1.5, persisted.getExtraGrade());
        assertEquals(1, assignmentsInSession().size());
    }

    // --- REGRA: APENAS UM ALUNO POR PAPEL POR SESSÃO ---

    @Test
    @DisplayName("[QA] Deve recusar com 422 o papel de Secretário para um segundo aluno da sessão, mantendo só o primeiro no banco")
    void assignRole_SameSecretaryRoleToSecondStudent_Returns422_AndKeepsFirstHolder() throws Exception {
        // 1º aluno recebe o papel de Secretário de Quadro
        putRole(tutor, SessionRole.BOARD_SECRETARY, student, 0.5).andExpect(status().isCreated());
        entityManager.flush();
        entityManager.clear();

        // 2º aluno para o mesmo papel, na mesma sessão
        putRole(tutor, SessionRole.BOARD_SECRETARY, otherStudent, 0.5)
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.message").value(ROLE_TAKEN_MESSAGE));

        entityManager.flush();
        entityManager.clear();

        assertEquals(Map.of(student.getId(), SessionRole.BOARD_SECRETARY), rolesInSession());

        // A recusa é por papel: o 2º aluno ainda pode ser o Secretário de Mesa
        putRole(tutor, SessionRole.TABLE_SECRETARY, otherStudent, 0.5).andExpect(status().isCreated());
        entityManager.flush();
        entityManager.clear();

        assertEquals(Map.of(
                student.getId(), SessionRole.BOARD_SECRETARY,
                otherStudent.getId(), SessionRole.TABLE_SECRETARY), rolesInSession());
    }

    @Test
    @DisplayName("Deve recusar com 422 um segundo papel para o mesmo aluno da sessão, mantendo o primeiro no banco")
    void assignRole_SecondRoleToSameStudent_Returns422_AndKeepsFirstRole() throws Exception {
        putRole(tutor, SessionRole.COORDINATOR, student, 1.0).andExpect(status().isCreated());
        entityManager.flush();
        entityManager.clear();

        putRole(tutor, SessionRole.TABLE_SECRETARY, student, 0.5)
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.message").value(STUDENT_HAS_ROLE_MESSAGE));

        entityManager.flush();
        entityManager.clear();

        assertEquals(Map.of(student.getId(), SessionRole.COORDINATOR), rolesInSession());
    }

    // --- REGRA: O PAPEL VAI PARA UM ALUNO ATIVO DA SALA ---

    @Test
    @DisplayName("Deve retornar 400 e não gravar quando o aluno é ativo apenas em outra sala")
    void assignRole_ToActiveStudentOfAnotherRoom_Returns400_AndPersistsNothing() throws Exception {
        // Ativo, mas em outra sala: o vínculo precisa ser conferido na sala da sessão (sessão → problema → sala).
        // O vínculo inativo é a mesma consulta, já testada no RoomMemberRepositoryTest da US06
        User outsider = persistUser("Aluno de Outra Sala");
        persistStudentMember(persistRoom("Outra Sala", tutor), outsider);
        entityManager.flush();
        entityManager.clear();

        putRole(tutor, SessionRole.COORDINATOR, outsider, 1.0)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(NOT_ACTIVE_STUDENT_MESSAGE));

        entityManager.flush();
        entityManager.clear();

        assertTrue(assignmentsInSession().isEmpty());
    }

    // --- POSSE DA SALA ---

    @Test
    @DisplayName("Deve retornar 403 e não gravar quando o usuário é tutor de outra sala")
    void assignRole_ByTutorOfAnotherRoom_Returns403_AndPersistsNothing() throws Exception {
        // O intruso também é tutor, mas de outra sala: a permissão precisa estar ligada a esta sala
        User intruder = persistUser("Tutor Intruso");
        persistRoom("Sala do Intruso", intruder);
        entityManager.flush();
        entityManager.clear();

        putRole(intruder, SessionRole.COORDINATOR, student, 1.0)
                .andExpect(status().isForbidden())
                // O 403 do GlobalExceptionHandler é texto puro, não JSON
                .andExpect(content().string(NOT_TUTOR_MESSAGE));

        entityManager.flush();
        entityManager.clear();

        assertTrue(assignmentsInSession().isEmpty());
    }

    // --- NOTA EXTRA GRAVADA -> CÁLCULO DA NOTA ---

    @Test
    @DisplayName("Deve somar à fórmula padrão a nota extra gravada via PUT, só para o aluno que tem o papel")
    void calculateSessionGrade_AfterRoleSavedThroughFullStack_AddsPersistedExtraGrade() throws Exception {
        // Fórmula da US08 já gravada: pesos 0.4 / 0.3 / 0.3
        PerformanceTable table = persistPerformanceTable(Map.of("Conteúdo", 0.4, "Participação", 0.3, "Autoavaliação", 0.3));
        Map<String, UUID> criterionIds = table.getCriteriaList().stream()
                .collect(Collectors.toMap(Criterion::getName, Criterion::getId));
        entityManager.clear();

        putRole(tutor, SessionRole.COORDINATOR, student, 1.0).andExpect(status().isCreated());
        entityManager.flush();
        entityManager.clear();

        Map<UUID, Double> grades = Map.of(
                criterionIds.get("Conteúdo"), 8.0,
                criterionIds.get("Participação"), 6.0,
                criterionIds.get("Autoavaliação"), 10.0);

        // 8.0*0.4 + 6.0*0.3 + 10.0*0.3 = 8.0 pela fórmula; + 1.0 do papel gravado = 9.0
        assertEquals(9.0, sessionRoleAssignmentService.calculateSessionGrade(
                session.getId(), student.getId(), table.getId(), grades), 1e-9);
        // Mesmas notas, sem papel na sessão: fica só a fórmula
        assertEquals(8.0, sessionRoleAssignmentService.calculateSessionGrade(
                session.getId(), otherStudent.getId(), table.getId(), grades), 1e-9);
    }

    // Helpers

    private ResultActions putRole(User requester, SessionRole role, User target, double extraGrade) throws Exception {
        return mockMvc.perform(put(ROUTE, session.getId(), role.name())
                .with(authenticatedAs(requester.getId().toString()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new SessionRoleAssignmentRequest(target.getId(), extraGrade))));
    }

    private SessionRoleAssignment assignmentOf(User target) {
        return sessionRoleAssignmentRepository.findBySessionIdAndStudentId(session.getId(), target.getId()).orElseThrow();
    }

    private List<SessionRoleAssignment> assignmentsInSession() {
        return sessionRoleAssignmentRepository.findAll().stream()
                .filter(a -> a.getSession().getId().equals(session.getId()))
                .toList();
    }

    // Quem tem qual papel na sessão, relido do banco
    private Map<UUID, SessionRole> rolesInSession() {
        return assignmentsInSession().stream()
                .collect(Collectors.toMap(a -> a.getStudent().getId(), SessionRoleAssignment::getRole));
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único
        user.setEmail("us10." + UUID.randomUUID().toString().substring(0, 8) + "@avalia.edu");
        user.setPassword("senhaSegura123");
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User roomTutor) {
        String code = "R10" + UUID.randomUUID().toString().substring(0, 3).toUpperCase();
        Room newRoom = new Room();
        newRoom.setName(name);
        newRoom.setAccessCode(code);
        newRoom.setInviteLink("app/join/" + code);
        newRoom.setTutor(roomTutor);
        return roomRepository.save(newRoom);
    }

    // O aluno é membro ativo da sala, como na lista real da sessão
    private void persistStudentMember(Room targetRoom, User user) {
        RoomMember member = new RoomMember();
        member.setRoom(targetRoom);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(true);
        entityManager.persist(member);
    }

    private TutoringSession persistSession(Room targetRoom) {
        Problem problem = new Problem();
        problem.setTitle("Problema 1");
        problem.setRoom(targetRoom);
        problem.setCreatedAt(CREATED_AT.minus(1, ChronoUnit.DAYS));
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);
        problem = problemRepository.save(problem);

        TutoringSession newSession = new TutoringSession();
        newSession.setProblem(problem);
        return tutoringSessionRepository.save(newSession);
    }

    private PerformanceTable persistPerformanceTable(Map<String, Double> weightsByName) {
        PerformanceTable newTable = new PerformanceTable();
        newTable.setName("Tabela de Desempenho");
        newTable.setRoom(roomRepository.findById(room.getId()).orElseThrow());
        weightsByName.forEach((name, weight) -> {
            Criterion criterion = new Criterion();
            criterion.setName(name);
            criterion.setDescription("Descrição de " + name);
            criterion.setWeight(weight);
            criterion.setPerformanceTable(newTable);
            newTable.getCriteriaList().add(criterion);
        });
        PerformanceTable saved = performanceTableRepository.save(newTable);
        entityManager.flush();
        return saved;
    }
}
