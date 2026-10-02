package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Criterion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CriterionRepository extends JpaRepository<Criterion, String> {
    List<Criterion> findByPerformanceTableId(String performanceTableId);
}
