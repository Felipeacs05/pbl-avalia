package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

    Optional<Attendance> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);
}
