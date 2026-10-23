package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.FeedbackDTO;
import com.uefs.tfs.avaliasystem.dto.PageResponse;
import com.uefs.tfs.avaliasystem.model.Feedback;
import com.uefs.tfs.avaliasystem.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeedbackRetrievalService {

    private final FeedbackRepository feedbackRepository;

    @Transactional(readOnly = true)
    public PageResponse<FeedbackDTO> getStudentFeedbacks(UUID studentId, UUID requesterId, Pageable pageable) {
        Page<Feedback> page;

        if (studentId.equals(requesterId)) {
            // O aluno lê tudo o que foi direcionado a ele
            page = feedbackRepository.findByStudentIdOrderByCreatedAtDesc(studentId, pageable);
        } else if (feedbackRepository.existsByStudentIdAndProblemRoomTutorId(studentId, requesterId)) {
            // O tutor emissor lê somente os feedbacks que ele mesmo criou
            page = feedbackRepository.findByStudentIdAndProblemRoomTutorIdOrderByCreatedAtDesc(studentId, requesterId, pageable);
        } else {
            throw new AccessDeniedException("Acesso negado: apenas o aluno ou o tutor emissor podem ler estes feedbacks");
        }

        return PageResponse.from(page.map(FeedbackDTO::from));
    }
}