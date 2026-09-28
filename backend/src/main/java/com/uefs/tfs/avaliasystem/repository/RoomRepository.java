package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, String> {

    boolean existsByAccessCode(String accessCode);

    Optional<Room> findByAccessCode(String accessCode);

    @Query("SELECT DISTINCT r FROM Room r " +
            "LEFT JOIN RoomMember rm ON rm.room = r " +
            "WHERE r.tutor.id = :userId OR (rm.user.id = :userId AND rm.active = true)")
    List<Room> findAllByTutorOrActiveMember(@Param("userId") java.util.UUID userId);
}