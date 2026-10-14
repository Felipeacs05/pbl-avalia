package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {
    Optional<RoomMember> findByRoomIdAndUserId(UUID roomId, UUID userId);
    List<RoomMember> findByRoomIdAndUserIdIn(UUID roomId, Collection<UUID> userIds);

    // US18: carômetro paginado, apenas alunos ativos, em ordem alfabética
    Page<RoomMember> findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(UUID roomId, Role role, Pageable pageable);
}