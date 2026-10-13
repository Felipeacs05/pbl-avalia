package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {
    List<Feedback> findByProblemId(UUID problemId);
}
