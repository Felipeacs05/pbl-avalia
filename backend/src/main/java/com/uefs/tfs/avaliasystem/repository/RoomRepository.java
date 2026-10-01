package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    List<Room> findByTutorId(UUID tutorId);

    @Query("SELECT DISTINCT rm.room FROM RoomMember rm " +
            "WHERE rm.user.id = :userId AND rm.active = true")
    List<Room> findRoomsByParticipantId(@Param("userId") UUID userId);

    boolean existsByAccessCode(String accessCode);

    boolean existsByIdAndTutorId(UUID roomId, UUID tutorId);

    Optional<Room> findByAccessCode(String accessCode);

    // Consulta portátil com subquery (evita erros no parse do JPQL)
    @Query("SELECT DISTINCT r FROM Room r " +
            "WHERE r.tutor.id = :userId " +
            "OR r.id IN (SELECT rm.room.id FROM RoomMember rm WHERE rm.user.id = :userId AND rm.active = true)")
    List<Room> findAllByTutorOrActiveMember(@Param("userId") UUID userId);
}