package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.SessionRole;
import com.uefs.tfs.avaliasystem.model.SessionRoleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRoleAssignmentRepository extends JpaRepository<SessionRoleAssignment, UUID> {

    boolean existsBySessionIdAndRole(UUID sessionId, SessionRole role);

    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);

    Optional<SessionRoleAssignment> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);

    @Query("""
            SELECT a FROM SessionRoleAssignment a
            JOIN FETCH a.session s
            JOIN FETCH s.problem p
            WHERE p.room.id = :roomId
            """)
    List<SessionRoleAssignment> findAllInRoom(@Param("roomId") UUID roomId);
}
