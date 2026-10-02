package com.uefs.tfs.avaliasystem.US05;

import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.dto.ProblemResponse;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.service.ProblemService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

// Pure unit test: repositories are mocked, no Spring context, no database
@ExtendWith(MockitoExtension.class)
class ProblemServiceTest {

    @InjectMocks
    private ProblemService problemService;

    @Mock
    private ProblemRepository problemRepository;

    @Mock
    private RoomRepository roomRepository;

    // Captures the entity the service tried to save so its state can be inspected
    @Captor
    private ArgumentCaptor<Problem> problemCaptor;

    private Room room;
    private Problem existingProblem;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-99d9-a999-999999999999");
    private final UUID ROOM_UUID = UUID.fromString("987e6543-e21b-12d3-a456-426614174000");
    private final UUID PROBLEM_UUID = UUID.fromString("555e5555-e55b-55d5-a555-555555555555");
    private final Instant CREATED_AT = Instant.parse("2026-03-01T10:00:00Z");

    @BeforeEach
    void setUp() {
        User tutor = new User();
        tutor.setId(TUTOR_UUID);
        tutor.setName("Test Tutor");

        room = new Room();
        room.setId(ROOM_UUID);
        room.setName("Software Engineering Module");
        room.setTutor(tutor);

        // Pre-existing problem used by the update and delete scenarios
        existingProblem = new Problem();
        existingProblem.setId(PROBLEM_UUID);
        existingProblem.setTitle("Problem 1");
        existingProblem.setRoom(room);
        existingProblem.setCreatedAt(CREATED_AT);
    }

    // --- CREATION ---

    @Test
    @DisplayName("[US05] Should create a problem linked to the room when the user is the room Tutor")
    void createProblem_ByRoomTutor_SavesProblemLinkedToRoom() {
        ProblemRequest request = new ProblemRequest("Problem 1");

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));
        // Simulates the database assigning the id, so the response must be built from what save returns
        Mockito.when(problemRepository.save(any(Problem.class))).thenAnswer(i -> {
            Problem saved = i.getArgument(0);
            saved.setId(PROBLEM_UUID);
            return saved;
        });

        ProblemResponse response = problemService.createProblem(ROOM_UUID, request, TUTOR_UUID);

        Mockito.verify(problemRepository).save(problemCaptor.capture());
        Problem captured = problemCaptor.getValue();

        assertEquals("Problem 1", captured.getTitle());
        assertEquals(ROOM_UUID, captured.getRoom().getId());
        // The creation timestamp is what drives the chronological listing
        assertNotNull(captured.getCreatedAt());

        assertEquals(PROBLEM_UUID, response.getId());
        assertEquals("Problem 1", response.getTitle());
    }

    @Test
    @DisplayName("[US05] Should block problem creation when the user is not the room Tutor (IDOR)")
    void createProblem_ByNonTutor_ThrowsSecurityException() {
        ProblemRequest request = new ProblemRequest("Problem 1");

        Mockito.when(roomRepository.findById(ROOM_UUID)).thenReturn(Optional.of(room));

        SecurityException exception = assertThrows(SecurityException.class,
                () -> problemService.createProblem(ROOM_UUID, request, STUDENT_UUID));

        assertEquals("Only the room Tutor can manage its problems.", exception.getMessage());
        Mockito.verify(problemRepository, Mockito.never()).save(any(Problem.class));
        // Stronger than never().save: no write of any kind (saveAndFlush, saveAll...) may reach the repository
        Mockito.verifyNoInteractions(problemRepository);
    }

    // --- UPDATE ---

    @Test
    @DisplayName("[US05] Should update only the title when the user is the room Tutor")
    void updateProblem_ByRoomTutor_UpdatesOnlyTitle() {
        ProblemRequest request = new ProblemRequest("Problem 1 - Revised");

        Mockito.when(problemRepository.findById(PROBLEM_UUID)).thenReturn(Optional.of(existingProblem));
        Mockito.when(problemRepository.save(any(Problem.class))).thenAnswer(i -> i.getArgument(0));

        ProblemResponse response = problemService.updateProblem(PROBLEM_UUID, request, TUTOR_UUID);

        Mockito.verify(problemRepository).save(problemCaptor.capture());
        Problem captured = problemCaptor.getValue();

        assertEquals("Problem 1 - Revised", captured.getTitle());
        // Room link and creation date must not change, or the chronological order would break
        assertEquals(ROOM_UUID, captured.getRoom().getId());
        assertEquals(CREATED_AT, captured.getCreatedAt());

        // The Controller returns this response as the PUT body
        assertEquals(PROBLEM_UUID, response.getId());
        assertEquals("Problem 1 - Revised", response.getTitle());
    }

    @Test
    @DisplayName("[US05] Should block problem update when the user is not the room Tutor (IDOR)")
    void updateProblem_ByNonTutor_ThrowsSecurityException() {
        ProblemRequest request = new ProblemRequest("Hijacked Title");

        Mockito.when(problemRepository.findById(PROBLEM_UUID)).thenReturn(Optional.of(existingProblem));

        SecurityException exception = assertThrows(SecurityException.class,
                () -> problemService.updateProblem(PROBLEM_UUID, request, STUDENT_UUID));

        assertEquals("Only the room Tutor can manage its problems.", exception.getMessage());
        Mockito.verify(problemRepository, Mockito.never()).save(any(Problem.class));
        // Only the ownership lookup is allowed; any other repository call would be a leaked write
        Mockito.verify(problemRepository).findById(PROBLEM_UUID);
        Mockito.verifyNoMoreInteractions(problemRepository);
    }

    // --- DELETION ---

    @Test
    @DisplayName("[US05] Should delete the problem when the user is the room Tutor")
    void deleteProblem_ByRoomTutor_DeletesFromRepository() {
        Mockito.when(problemRepository.findById(PROBLEM_UUID)).thenReturn(Optional.of(existingProblem));

        problemService.deleteProblem(PROBLEM_UUID, TUTOR_UUID);

        Mockito.verify(problemRepository, Mockito.times(1)).delete(existingProblem);
    }

    @Test
    @DisplayName("[US05] Should block problem deletion when the user is not the room Tutor (IDOR)")
    void deleteProblem_ByNonTutor_ThrowsSecurityException() {
        Mockito.when(problemRepository.findById(PROBLEM_UUID)).thenReturn(Optional.of(existingProblem));

        SecurityException exception = assertThrows(SecurityException.class,
                () -> problemService.deleteProblem(PROBLEM_UUID, STUDENT_UUID));

        assertEquals("Only the room Tutor can manage its problems.", exception.getMessage());
        Mockito.verify(problemRepository, Mockito.never()).delete(any(Problem.class));
        // Also rules out deleteById or any other removal path
        Mockito.verify(problemRepository).findById(PROBLEM_UUID);
        Mockito.verifyNoMoreInteractions(problemRepository);
    }

    // --- LISTING ---

    @Test
    @DisplayName("[US05] Should list the room problems keeping the chronological order from the repository")
    void listProblems_ReturnsProblemsInChronologicalOrder() {
        Problem secondProblem = new Problem();
        UUID otherId = UUID.fromString("666e6666-e66b-66d6-a666-666666666666");
        secondProblem.setId(otherId);
        secondProblem.setTitle("Problem 2");
        secondProblem.setRoom(room);
        secondProblem.setCreatedAt(CREATED_AT.plusSeconds(3600));

        Mockito.when(problemRepository.findAllByRoomIdOrderByCreatedAtAsc(ROOM_UUID))
               .thenReturn(List.of(existingProblem, secondProblem));

        List<ProblemResponse> result = problemService.listProblems(ROOM_UUID);

        // Each entity returned by the repository must be mapped to a response, in the same order
        assertEquals(List.of(PROBLEM_UUID, otherId),
                result.stream().map(ProblemResponse::getId).toList());
        assertEquals(List.of("Problem 1", "Problem 2"),
                result.stream().map(ProblemResponse::getTitle).toList());
    }
}