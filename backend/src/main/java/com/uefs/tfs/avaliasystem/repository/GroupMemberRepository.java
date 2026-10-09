package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {

    List<GroupMember> findByGroupId(UUID groupId);

    Optional<GroupMember> findByGroupIdAndUserId(UUID groupId, UUID userId);

    boolean existsByGroupIdAndUserId(UUID groupId, UUID userId);

    boolean existsByGroupRoomIdAndUserId(UUID roomId, UUID userId);

    Optional<GroupMember> findByGroupRoomIdAndUserId(UUID roomId, UUID userId);
}
