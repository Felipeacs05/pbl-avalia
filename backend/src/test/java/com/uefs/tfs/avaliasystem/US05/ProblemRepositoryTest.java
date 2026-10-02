package com.uefs.tfs.avaliasystem.US05;

import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Persistence slice only (H2 in memory, no web server); each test rolls back
@DataJpaTest
class ProblemRepositoryTest {

    @Autowired
    private ProblemRepository problemRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User tutor;
    private Room room;

    // Tutor and Room must exist physically to satisfy the foreign keys of Problem
    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setEmail("tutor_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        tutor.setPassword("senha123");
        tutor.setName("Persisted Tutor");
        tutor = entityManager.persistFlushFind(tutor);

        room = persistRoom("PRB01", "Problems Room");
    }

    // --- REAL DATABASE WRITE ---

    @Test
    @DisplayName("[US05] save should persist the problem linked to its room")
    void save_PersistsProblemLinkedToRoom_AndSurvivesContextClear() {
        Problem problem = new Problem();
        problem.setTitle("Problem 1");
        problem.setRoom(room);
        problem.setCreatedAt(Instant.parse("2026-03-01T10:00:00Z"));
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);

        UUID savedId = problemRepository.save(problem).getId();

        // Forces the read below to hit the database instead of the persistence context
        entityManager.flush();
        entityManager.clear();

        Optional<Problem> found = problemRepository.findById(savedId);
        assertTrue(found.isPresent());
        assertEquals("Problem 1", found.get().getTitle());
        assertEquals(room.getId(), found.get().getRoom().getId());
        assertEquals(Instant.parse("2026-03-01T10:00:00Z"), found.get().getCreatedAt());
    }

    // --- CHRONOLOGICAL LISTING ---

    @Test
    @DisplayName("[US05] Should list only the problems of the given room, in chronological order")
    void findAllByRoomIdOrderByCreatedAtAsc_ReturnsOnlyRoomProblemsInChronologicalOrder() {
        Instant base = Instant.parse("2026-03-01T10:00:00Z");

        // Inserted out of order on purpose: the order must come from createdAt, not insertion
        persistProblem(room, "Problem 3", base.plus(2, ChronoUnit.DAYS));
        persistProblem(room, "Problem 1", base);
        persistProblem(room, "Problem 2", base.plus(1, ChronoUnit.DAYS));

        Room otherRoom = persistRoom("PRB02", "Other Room");
        persistProblem(otherRoom, "Other Room Problem", base.minus(1, ChronoUnit.DAYS));

        entityManager.clear();

        List<Problem> result = problemRepository.findAllByRoomIdOrderByCreatedAtAsc(room.getId());

        assertEquals(List.of("Problem 1", "Problem 2", "Problem 3"),
                result.stream().map(Problem::getTitle).toList());
    }

    // Helpers

    private Room persistRoom(String code, String name) {
        Room newRoom = new Room();
        newRoom.setName(name);
        newRoom.setAccessCode(code);
        newRoom.setInviteLink("app/join/" + code);
        newRoom.setTutor(tutor);
        return entityManager.persistFlushFind(newRoom);
    }

    private Problem persistProblem(Room targetRoom, String title, Instant createdAt) {
        Problem problem = new Problem();
        problem.setTitle(title);
        problem.setRoom(targetRoom);
        problem.setCreatedAt(createdAt);
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);
        return entityManager.persistFlushFind(problem);
    }
}