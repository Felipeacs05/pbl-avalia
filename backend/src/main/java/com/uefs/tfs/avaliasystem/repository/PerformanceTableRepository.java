package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PerformanceTableRepository extends JpaRepository<PerformanceTable, String> {
    List<PerformanceTable> findByRoomId(String roomId);
}
