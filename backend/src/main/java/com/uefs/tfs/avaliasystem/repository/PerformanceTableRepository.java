package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PerformanceTableRepository extends JpaRepository<PerformanceTable, UUID> {
    List<PerformanceTable> findByRoomId(UUID roomId);

    @Query("""
            SELECT COUNT(pt) > 0
            FROM PerformanceTable pt
            WHERE pt.id = :performanceTableId
              AND pt.room.tutor.id = :tutorId
            """)
    boolean existsRoomTableOwnedByTutor(
            @Param("performanceTableId") UUID performanceTableId,
            @Param("tutorId") UUID tutorId
    );

    @Query("""
            SELECT COUNT(pt) > 0
            FROM PerformanceTable pt
            WHERE pt.id = :performanceTableId
              AND pt.problem.room.tutor.id = :tutorId
            """)
    boolean existsProblemTableOwnedByTutor(
            @Param("performanceTableId") UUID performanceTableId,
            @Param("tutorId") UUID tutorId
    );
}
