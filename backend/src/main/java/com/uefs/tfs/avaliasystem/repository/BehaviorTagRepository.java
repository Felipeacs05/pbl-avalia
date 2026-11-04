package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.BehaviorTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BehaviorTagRepository extends JpaRepository<BehaviorTag, UUID> {
    List<BehaviorTag> findAllByRoomIdOrderByNameAsc(UUID roomId);
}
