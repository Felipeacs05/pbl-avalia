package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.dto.ProblemResponse;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final RoomRepository roomRepository;

    public ProblemService(ProblemRepository problemRepository, RoomRepository roomRepository) {
        this.problemRepository = problemRepository;
        this.roomRepository = roomRepository;
    }

    public ProblemResponse createProblem(UUID roomId, ProblemRequest request, UUID userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        validateTutorPermission(room, userId);

        Problem problem = new Problem();
        problem.setTitle(request.getTitle());
        problem.setRoom(room);
        problem.setCreatedAt(Instant.now());

        Problem savedProblem = problemRepository.save(problem);
        return new ProblemResponse(savedProblem);
    }

    public ProblemResponse updateProblem(UUID problemId, ProblemRequest request, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        problem.setTitle(request.getTitle()); // Ou request.title()
        Problem updatedProblem = problemRepository.save(problem);
        return new ProblemResponse(updatedProblem);
    }

    public void deleteProblem(UUID problemId, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        // Importante: usar delete(problem) e não deleteById(problemId)
        problemRepository.delete(problem);
    }

    public List<ProblemResponse> listProblems(UUID roomId) {
        return problemRepository.findAllByRoomIdOrderByCreatedAtAsc(roomId)
                .stream()
                .map(ProblemResponse::new)
                .toList();
    }

    private void validateTutorPermission(Room room, UUID userId) {
        if (room.getTutor() == null || !room.getTutor().getId().equals(userId)) {
            throw new SecurityException("Only the room Tutor can manage its problems.");
        }
    }
}