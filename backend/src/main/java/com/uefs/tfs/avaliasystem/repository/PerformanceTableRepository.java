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
    SELECT CASE WHEN COUNT(pt) > 0 THEN true ELSE false END
    FROM PerformanceTable pt
    WHERE pt.id = :performanceTableId
      AND (
          pt.room.tutor.id = :userId
          OR EXISTS (
              SELECT rm.id
              FROM RoomMember rm
              WHERE rm.room = pt.room
                AND rm.user.id = :userId
                AND rm.active = true
          )
      )
""")
    boolean existsAccessibleByIdAndUserId(
            @Param("performanceTableId") UUID performanceTableId,
            @Param("userId") UUID userId
    );

    @Query("""
        SELECT CASE WHEN COUNT(pt) > 0 THEN true ELSE false END
        FROM PerformanceTable pt
        WHERE pt.id = :performanceTableId
          AND pt.room.tutor.id = :userId
        """)
    boolean existsByIdAndRoomTutorId(
            @Param("performanceTableId") UUID performanceTableId,
            @Param("userId") UUID userId
    );
}
