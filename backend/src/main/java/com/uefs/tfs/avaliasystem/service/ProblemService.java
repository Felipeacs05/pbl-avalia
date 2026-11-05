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

    public ProblemResponse getProblem(UUID problemId) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new IllegalArgumentException("Problem not found"));
        ProblemResponse response = new ProblemResponse(problem);
        if (tutoringSessionRepository != null) {
            List<TutoringSession> sessions = tutoringSessionRepository.findAllByProblemId(problemId);
            List<Map<String, Object>> sessionList = sessions.stream()
                    .map(s -> {
                        boolean isClosed = com.uefs.tfs.avaliasystem.controller.TutoringSessionController.isSessionClosed(s.getId());
                        Map<String, Object> sessionMap = new java.util.HashMap<>();
                        sessionMap.put("id", s.getId().toString());
                        sessionMap.put("problemId", problem.getId().toString());
                        sessionMap.put("date", java.time.LocalDate.now().toString());
                        sessionMap.put("displayDate", "Sessão " + s.getId().toString().substring(0, 4).toUpperCase());
                        sessionMap.put("status", isClosed ? "completed" : "in_progress");
                        sessionMap.put("statusLabel", isClosed ? "Encerrada" : "Em andamento");
                        sessionMap.put("isClosed", isClosed);
                        return sessionMap;
                    })
                    .toList();
            response.setSessions(sessionList);
        }
        return response;
    }

    private void validateTutorPermission(Room room, UUID userId) {
        if (room.getTutor() == null || !room.getTutor().getId().equals(userId)) {
            throw new SecurityException("Only the room Tutor can manage its problems.");
        }
    }
}
