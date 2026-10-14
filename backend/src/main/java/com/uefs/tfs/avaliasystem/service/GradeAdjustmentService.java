package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentRequest;
import com.uefs.tfs.avaliasystem.dto.GradeAdjustmentResponse;
import com.uefs.tfs.avaliasystem.exception.AssessmentNotFoundException;
import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GradeAdjustmentService {

    private final AssessmentRepository assessmentRepository;

    @Transactional
    public GradeAdjustmentResponse adjustGrade(UUID assessmentId, UUID tutorId, GradeAdjustmentRequest request) {
        if (request.justification() == null || request.justification().isBlank()) {
            throw new IllegalArgumentException("Justificativa é obrigatória");
        }
        if (request.adjustedGrade() == null || request.adjustedGrade() < 0 || request.adjustedGrade() > 10) {
            throw new IllegalArgumentException("A nota ajustada deve estar entre 0 e 10");
        }

        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new AssessmentNotFoundException("Avaliação não encontrada"));

        UUID roomTutorId = assessment.getProblem().getRoom().getTutor().getId();
        if (!roomTutorId.equals(tutorId)) {
            throw new AccessDeniedException("Acesso negado: apenas o tutor da sala pode ajustar notas");
        }

        // Preserva a nota original apenas no primeiro ajuste (reajustes não a sobrescrevem)
        if (assessment.getOriginalGrade() == null) {
            assessment.setOriginalGrade(assessment.getScore());
        }
        assessment.setAdjustedGrade(request.adjustedGrade());
        assessment.setScore(request.adjustedGrade()); // nota efetiva passa a ser a ajustada
        assessment.setJustification(request.justification().trim());
        assessment.setModifiedByTutor(true);

        return GradeAdjustmentResponse.from(assessmentRepository.save(assessment));
    }
}