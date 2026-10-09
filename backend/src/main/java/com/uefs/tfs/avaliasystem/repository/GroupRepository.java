package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupRepository extends JpaRepository<Group, UUID> {

    List<Group> findByRoomId(UUID roomId);

    Optional<Group> findByIdAndRoomId(UUID groupId, UUID roomId);
}
