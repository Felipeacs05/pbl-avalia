package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ProblemRequest;
import com.uefs.tfs.avaliasystem.dto.ProblemResponse;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final RoomRepository roomRepository;

    @Autowired(required = false)
    private TutoringSessionRepository tutoringSessionRepository;

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
        if (request.getDescription() != null) {
            problem.setDescription(request.getDescription());
        }
        problem.setRoom(room);
        problem.setCreatedAt(Instant.now());

        Problem savedProblem = problemRepository.save(problem);
        return new ProblemResponse(savedProblem);
    }

    public ProblemResponse updateProblem(UUID problemId, ProblemRequest request, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        problem.setTitle(request.getTitle());
        if (request.getDescription() != null) {
            problem.setDescription(request.getDescription());
        }
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

    public ProblemResponse getProblemById(UUID problemId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));
        return new ProblemResponse(problem);
    }

    public Map<String, Object> createOrGetSession(UUID problemId, UUID userId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));

        validateTutorPermission(problem.getRoom(), userId);

        if (tutoringSessionRepository == null) {
            return Map.of(
                    "id", UUID.randomUUID().toString(),
                    "problemId", problemId.toString(),
                    "status", "OPEN"
            );
        }

        TutoringSession session = new TutoringSession();
        session.setProblem(problem);
        TutoringSession saved = tutoringSessionRepository.save(session);

        return Map.of(
                "id", saved.getId().toString(),
                "problemId", problemId.toString(),
                "status", "OPEN"
        );
    }

    public List<Map<String, Object>> listSessions(UUID problemId) {
        if (tutoringSessionRepository == null) {
            return List.of();
        }
        return tutoringSessionRepository.findByProblemId(problemId)
                .stream()
                .map(s -> Map.<String, Object>of(
                        "id", s.getId().toString(),
                        "problemId", problemId.toString(),
                        "status", "OPEN"
                ))
                .toList();
    }

    private void validateTutorPermission(Room room, UUID userId) {
        if (room.getTutor() == null || !room.getTutor().getId().equals(userId)) {
            throw new SecurityException("Only the room Tutor can manage its problems.");
        }
    }
}
