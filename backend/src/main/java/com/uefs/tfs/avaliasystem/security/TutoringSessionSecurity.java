package com.uefs.tfs.avaliasystem.security;

import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("tutoringSessionSecurity")
@RequiredArgsConstructor
public class TutoringSessionSecurity {

    private static final String NOT_TUTOR_MESSAGE =
            "Apenas o tutor responsável pela sala pode registrar comportamentos.";

    private final TutoringSessionRepository tutoringSessionRepository;

    public boolean requireTutor(UUID sessionId, UUID requesterId) {
        if (!tutoringSessionRepository.existsByIdAndProblemRoomTutorId(sessionId, requesterId)) {
            throw new SecurityException(NOT_TUTOR_MESSAGE);
        }
        return true;
    }
}
