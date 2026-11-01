package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRoleAssignmentRepository extends JpaRepository<SessionRoleAssignment, UUID> {

    boolean existsBySessionIdAndRole(UUID sessionId, SessionRole role);

    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);

    Optional<SessionRoleAssignment> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);
}
