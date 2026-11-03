package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.TutoringSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TutoringSessionRepository extends JpaRepository<TutoringSession, UUID> {
    List<TutoringSession> findByProblemId(UUID problemId);
}
