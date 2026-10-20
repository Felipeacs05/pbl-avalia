package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
    List<Feedback> findByProblemId(UUID problemId);

    // US17: feedbacks do aluno (visão do próprio aluno)
    Page<Feedback> findByStudentIdOrderByCreatedAtDesc(UUID studentId, Pageable pageable);

    // US17: feedbacks do aluno emitidos por um tutor específico (visão do tutor emissor)
    Page<Feedback> findByStudentIdAndProblemRoomTutorIdOrderByCreatedAtDesc(UUID studentId, UUID tutorId, Pageable pageable);

    boolean existsByStudentIdAndProblemRoomTutorId(UUID studentId, UUID tutorId);
}