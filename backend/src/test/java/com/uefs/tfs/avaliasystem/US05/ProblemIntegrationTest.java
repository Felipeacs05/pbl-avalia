package com.uefs.tfs.avaliasystem.US05;

import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// LEVEL: INTEGRATION (middle of the pyramid).
// Unlike ProblemControllerTest (Service mocked) and ProblemServiceTest (Repositories mocked),
// the whole Spring context is started here: real Controller, real Service and real Repository
// talking to H2 through MockMvc. Goal: catch "glue" bugs between layers that isolated tests
// cannot see (exception -> HTTP status mapping, real DTO serialization, one transaction across layers).
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
class ProblemIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private User tutor;
    private Room room;

    @BeforeEach
    void setUp() {
        tutor = persistUser("Integration Tutor");
        room = persistRoom("PRBI1", "Problems Integration Room");
    }

    // Authentication is out of scope: the authenticated user is injected directly as the Principal
    private RequestPostProcessor authenticatedAs(String userId) {
        return request -> {
            request.setUserPrincipal((Principal) () -> userId);
            return request;
        };
    }

    // --- CREATION THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US05] POST should cross Controller, Service and Repository and persist the problem linked to the room")
    void createProblem_ThroughFullStack_PersistsProblemLinkedToRoom() throws Exception {
        ProblemRequest request = new ProblemRequest("Problem 1");

        String responseBody = mockMvc.perform(post("/api/v1/rooms/{roomId}/problems", room.getId())
                        .with(authenticatedAs(tutor.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Problem 1"))
                .andReturn().getResponse().getContentAsString();

        String createdId = objectMapper.readTree(responseBody).get("id").asString();

        entityManager.flush();
        entityManager.clear();

        // Proof that the request went through all layers: the returned id is a real row in the database
        Problem persisted = problemRepository.findById(createdId).orElseThrow();
        assertEquals("Problem 1", persisted.getTitle());
        assertEquals(room.getId(), persisted.getRoom().getId());
        assertNotNull(persisted.getCreatedAt());
    }

    @Test
    @DisplayName("[US05] POST by the Tutor of another room should return 403 and persist nothing")
    void createProblem_ByTutorOfAnotherRoom_Returns403_AndPersistsNothing() throws Exception {
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("Intruder Tutor");
        persistRoom("PRBI3", "Intruder Own Room", intruder);
        ProblemRequest request = new ProblemRequest("Intruder Problem");

        mockMvc.perform(post("/api/v1/rooms/{roomId}/problems", room.getId())
                        .with(authenticatedAs(intruder.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertTrue(problemRepository.findAllByRoomIdOrderByCreatedAtAsc(room.getId()).isEmpty());
    }

    @Test
    @DisplayName("[US05] POST by an active student member of the room should return 403 and persist nothing")
    void createProblem_ByActiveStudentMember_Returns403_AndPersistsNothing() throws Exception {
        // Belonging to the room is not enough: only its Tutor can create problems
        User student = persistUser("Member Student");
        persistMember(room, student, true, null);
        ProblemRequest request = new ProblemRequest("Student Problem");

        mockMvc.perform(post("/api/v1/rooms/{roomId}/problems", room.getId())
                        .with(authenticatedAs(student.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertTrue(problemRepository.findAllByRoomIdOrderByCreatedAtAsc(room.getId()).isEmpty());
    }

    // --- UPDATE THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US05] PUT should persist the new title through all layers")
    void updateProblem_ThroughFullStack_PersistsNewTitle() throws Exception {
        Problem problem = persistProblem(room, "Problem 1", Instant.parse("2026-03-01T10:00:00Z"));
        ProblemRequest request = new ProblemRequest("Problem 1 - Revised");

        mockMvc.perform(put("/api/v1/problems/{id}", problem.getId())
                        .with(authenticatedAs(tutor.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(problem.getId()))
                .andExpect(jsonPath("$.title").value("Problem 1 - Revised"));

        entityManager.flush();
        entityManager.clear();

        Problem reloaded = problemRepository.findById(problem.getId()).orElseThrow();
        assertEquals("Problem 1 - Revised", reloaded.getTitle());
        // The creation date must survive the update, or the chronological order would break
        assertEquals(Instant.parse("2026-03-01T10:00:00Z"), reloaded.getCreatedAt());
    }

    @Test
    @DisplayName("[US05] PUT by the Tutor of another room should return 403 and not change the database")
    void updateProblem_ByTutorOfAnotherRoom_Returns403_AndDoesNotPersistChange() throws Exception {
        Problem problem = persistProblem(room, "Protected Problem", Instant.parse("2026-03-01T10:00:00Z"));
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("Intruder Tutor");
        persistRoom("PRBI4", "Intruder Own Room", intruder);
        ProblemRequest request = new ProblemRequest("Hijacked Title");

        mockMvc.perform(put("/api/v1/problems/{id}", problem.getId())
                        .with(authenticatedAs(intruder.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals("Protected Problem", problemRepository.findById(problem.getId()).orElseThrow().getTitle());
    }

    @Test
    @DisplayName("[US05] PUT by an active student member of the room should return 403 and not change the database")
    void updateProblem_ByActiveStudentMember_Returns403_AndDoesNotPersistChange() throws Exception {
        Problem problem = persistProblem(room, "Protected Problem", Instant.parse("2026-03-01T10:00:00Z"));
        // Belonging to the room is not enough: only its Tutor can edit problems (QA subtask scenario)
        User student = persistUser("Member Student");
        persistMember(room, student, true, null);
        ProblemRequest request = new ProblemRequest("Hijacked Title");

        mockMvc.perform(put("/api/v1/problems/{id}", problem.getId())
                        .with(authenticatedAs(student.getId()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals("Protected Problem", problemRepository.findById(problem.getId()).orElseThrow().getTitle());
    }

    // --- DELETION THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US05] DELETE should remove the problem row through all layers")
    void deleteProblem_ThroughFullStack_RemovesRowFromDatabase() throws Exception {
        Problem problem = persistProblem(room, "Problem to Delete", Instant.parse("2026-03-01T10:00:00Z"));

        mockMvc.perform(delete("/api/v1/problems/{id}", problem.getId())
                        .with(authenticatedAs(tutor.getId())))
                .andExpect(status().isNoContent());

        entityManager.flush();
        entityManager.clear();
        assertTrue(problemRepository.findById(problem.getId()).isEmpty());
    }

    @Test
    @DisplayName("[US05] DELETE by the Tutor of another room should return 403 and keep the row in the database")
    void deleteProblem_ByTutorOfAnotherRoom_Returns403_AndKeepsRow() throws Exception {
        Problem problem = persistProblem(room, "Protected Problem", Instant.parse("2026-03-01T10:00:00Z"));
        // The intruder is a Tutor too, but of another room: permission must be tied to this specific room
        User intruder = persistUser("Intruder Tutor");
        persistRoom("PRBI5", "Intruder Own Room", intruder);

        mockMvc.perform(delete("/api/v1/problems/{id}", problem.getId())
                        .with(authenticatedAs(intruder.getId())))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertTrue(problemRepository.findById(problem.getId()).isPresent());
    }

    @Test
    @DisplayName("[US05] DELETE by an active student member of the room should return 403 and keep the row in the database")
    void deleteProblem_ByActiveStudentMember_Returns403_AndKeepsRow() throws Exception {
        Problem problem = persistProblem(room, "Protected Problem", Instant.parse("2026-03-01T10:00:00Z"));
        // Belonging to the room is not enough: only its Tutor can delete problems
        User student = persistUser("Member Student");
        persistMember(room, student, true, null);

        mockMvc.perform(delete("/api/v1/problems/{id}", problem.getId())
                        .with(authenticatedAs(student.getId())))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertTrue(problemRepository.findById(problem.getId()).isPresent());
    }

    // --- CHRONOLOGICAL LISTING THROUGH THE FULL STACK ---

    @Test
    @DisplayName("[US05] GET should return only the room problems, in chronological order, from the real database")
    void listProblems_ThroughFullStack_ReturnsRoomProblemsInChronologicalOrder() throws Exception {
        Instant base = Instant.parse("2026-03-01T10:00:00Z");

        // Inserted out of order on purpose: the order must come from createdAt, not insertion
        persistProblem(room, "Problem 3", base.plus(2, ChronoUnit.DAYS));
        persistProblem(room, "Problem 1", base);
        persistProblem(room, "Problem 2", base.plus(1, ChronoUnit.DAYS));

        Room otherRoom = persistRoom("PRBI2", "Other Room");
        persistProblem(otherRoom, "Other Room Problem", base.minus(1, ChronoUnit.DAYS));

        entityManager.flush();
        entityManager.clear();

        mockMvc.perform(get("/api/v1/rooms/{roomId}/problems", room.getId())
                        .with(authenticatedAs(tutor.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].title").value("Problem 1"))
                .andExpect(jsonPath("$[1].title").value("Problem 2"))
                .andExpect(jsonPath("$[2].title").value("Problem 3"));
    }

    // Helpers

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        return userRepository.save(user);
    }

    private Room persistRoom(String code, String name) {
        return persistRoom(code, name, tutor);
    }

    private Room persistRoom(String code, String name, User owner) {
        Room newRoom = new Room();
        newRoom.setName(name);
        newRoom.setAccessCode(code);
        newRoom.setInviteLink("app/join/" + code);
        newRoom.setTutor(owner);
        return roomRepository.save(newRoom);
    }

    private Problem persistProblem(Room targetRoom, String title, Instant createdAt) {
        Problem problem = new Problem();
        problem.setTitle(title);
        problem.setRoom(targetRoom);
        problem.setCreatedAt(createdAt);
        return problemRepository.save(problem);
    }

    private void persistMember(Room targetRoom, User user, boolean active, Instant unlinkedAt) {
        RoomMember member = new RoomMember();
        member.setRoom(targetRoom);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        member.setUnlinkedAt(unlinkedAt);
        entityManager.persist(member);
        entityManager.flush();
    }
}
