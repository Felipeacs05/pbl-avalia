package com.uefs.tfs.avaliasystem.US20;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.PdfReportGenerator;
import com.uefs.tfs.avaliasystem.service.SpreadsheetReportGenerator;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
class ClassReportIntegrationTest {

    private static final String FINAL_URL = "/api/v1/rooms/{roomId}/reports/final";
    private static final String EXPORT_URL = "/api/v1/rooms/{roomId}/reports/export";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private ProblemRepository problemRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private EntityManager entityManager;

    @MockitoBean private PdfReportGenerator pdfGenerator;
    @MockitoBean private SpreadsheetReportGenerator spreadsheetGenerator;

    private User tutor;
    private User studentA;
    private User studentB;
    private User studentWithoutGrades;
    private Room room;
    private Problem p1;
    private Problem p2;
    private Problem p3;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Prof. Ana Souza");
        studentA = persistUser("Aluno A");
        studentB = persistUser("Aluno B");
        studentWithoutGrades = persistUser("Aluno Sem Notas");
        User formerStudent = persistUser("Ex-Aluno");

        room = new Room();
        room.setName("Módulo PBL 1");
        room.setAccessCode("RPT-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(tutor);
        room = roomRepository.save(room);

        persistMember(studentA, true);
        persistMember(studentB, true);
        persistMember(studentWithoutGrades, true);
        persistMember(formerStudent, false);

        p1 = persistProblem("Problema 1", 2.0, 0);
        p2 = persistProblem("Problema 2", 3.0, 7);
        p3 = persistProblem("Problema 3", 1.0, 14);

        persistGrade(p1, studentA, 8.0);
        persistGrade(p2, studentA, 6.0);
        persistGrade(p1, studentB, 10.0);
        persistGrade(p1, formerStudent, 2.0); // Nota do ex-aluno inserida

        entityManager.flush();
        entityManager.clear();
    }

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        user.setEmail(name.replaceAll("\\s+", "").toLowerCase() + "." + UUID.randomUUID() + "@uefs.br");
        user.setPassword("password123");
        return userRepository.save(user);
    }

    private void persistMember(User user, boolean active) {
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        member.setUnlinkedAt(active ? Instant.now() : Instant.now());
        entityManager.persist(member);
    }

    private Problem persistProblem(String title, double weight, int dayOffset) {
        Problem problem = new Problem();
        problem.setTitle(title);
        problem.setRoom(room);
        problem.setWeight(weight);
        problem.setSelfAssessmentReleased(false);
        problem.setPeerAssessmentReleased(false);
        problem.setCreatedAt(Instant.parse("2026-03-01T10:00:00Z").plusSeconds(86400L * dayOffset));
        return problemRepository.save(problem);
    }

    private void persistGrade(Problem problem, User student, double value) {
        Feedback feedback = new Feedback();
        feedback.setProblem(problem);
        feedback.setStudent(student);
        feedback.setGrade(value);
        feedback.setText("Feedback de " + student.getName());
        feedbackRepository.save(feedback);
    }

    @Nested
    @DisplayName("[US20] Relatório final de ponta a ponta")
    class FinalReportScenarios {

        @Test
        @DisplayName("[US20] Notas agrupadas por problema e média ponderada lidas do banco (com alunos inativos separados em withdrawnStudents)")
        void getFinalReport_ThroughFullStack_GroupsGradesAndIncludesWithdrawnStudents() throws Exception {
            mockMvc.perform(get(FINAL_URL, room.getId())
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.problems.length()").value(3))
                    .andExpect(jsonPath("$.problems[0].title").value("Problema 1"))
                    .andExpect(jsonPath("$.students.length()").value(3))
                    .andExpect(jsonPath("$.students[0].studentName").value("Aluno A"))
                    .andExpect(jsonPath("$.students[0].weightedAverage").value(6.8))
                    .andExpect(jsonPath("$.students[1].weightedAverage").value(10.0))
                    // Valida que o Ex-aluno está na lista isolada withdrawnStudents
                    .andExpect(jsonPath("$.withdrawnStudents.length()").value(1))
                    .andExpect(jsonPath("$.withdrawnStudents[0].studentName").value("Ex-Aluno"))
                    .andExpect(jsonPath("$.withdrawnStudents[0].partialAverage").value(2.0));
        }

        @Test
        @DisplayName("[US20] Requisição sem token JWT retorna 401")
        void getFinalReport_NoToken_Returns401() throws Exception {
            mockMvc.perform(get(FINAL_URL, room.getId()))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("[US19] Exportação de ponta a ponta")
    class ExportScenarios {

        @Test
        @DisplayName("[US19] Exportação em PDF entrega o arquivo (incluindo DTO formatado com a lista de desistentes)")
        void export_Pdf_ThroughFullStack_DeliversFileBuiltFromComputedReport() throws Exception {
            byte[] pdf = "%PDF-1.7 integracao".getBytes();
            when(pdfGenerator.generate(any(ClassReportResponse.class))).thenReturn(pdf);

            mockMvc.perform(get(EXPORT_URL, room.getId()).param("format", "PDF")
                            .with(jwt().jwt(j -> j.subject(tutor.getId().toString()))))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                    .andExpect(content().bytes(pdf));

            ArgumentCaptor<ClassReportResponse> captor = ArgumentCaptor.forClass(ClassReportResponse.class);
            verify(pdfGenerator).generate(captor.capture());
            ClassReportResponse sent = captor.getValue();
            assertThat(sent.students().get(0).weightedAverage()).isCloseTo(6.8, within(1e-9));
            assertThat(sent.withdrawnStudents()).hasSize(1);
            assertThat(sent.withdrawnStudents().get(0).studentName()).isEqualTo("Ex-Aluno");
        }
    }
}
