package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Criterion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CriterionRepository extends JpaRepository<Criterion, UUID> {
    List<Criterion> findByPerformanceTableId(UUID performanceTableId);
}
