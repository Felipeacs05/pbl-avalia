package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.Optional;
import java.util.List;

public interface AssessmentRepository extends JpaRepository<Assessment, UUID> {
    Optional<Assessment> findByProblemIdAndEvaluatorIdAndTargetId(UUID problemId, UUID evaluatorId, UUID targetId);
    List<Assessment> findByProblemIdAndEvaluatorId(UUID problemId, UUID evaluatorId);
}
