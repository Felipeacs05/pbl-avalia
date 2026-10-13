package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {}
