package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.BehaviorRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BehaviorRecordRepository extends JpaRepository<BehaviorRecord, UUID> {
}
