package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {
    Optional<RoomMember> findByRoomIdAndUserId(UUID roomId, UUID userId);
    List<RoomMember> findByRoomIdAndUserIdIn(UUID roomId, Collection<UUID> userIds);

    List<RoomMember> findAllByRoomIdAndActiveTrueOrderByUserNameAsc(UUID roomId);

    List<RoomMember> findByRoomIdAndActiveTrueAndRole(UUID roomId, Role role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT rm FROM RoomMember rm WHERE rm.room.id = :roomId AND rm.user.id = :userId")
    Optional<RoomMember> findByRoomIdAndUserIdForUpdate(
            @Param("roomId") UUID roomId,
            @Param("userId") UUID userId
    );

    boolean existsByRoomIdAndUserIdAndActiveTrue(UUID roomId, UUID userId);

    @Query("SELECT rm FROM RoomMember rm WHERE rm.room.id = :roomId AND rm.active = true AND rm.role = com.uefs.tfs.avaliasystem.model.Role.STUDENT")
    List<RoomMember> findAvailableStudentsByRoomId(@Param("roomId") UUID roomId);

    Page<RoomMember> findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(UUID roomId, Role role, Pageable pageable);
}
