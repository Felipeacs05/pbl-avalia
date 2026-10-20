package com.uefs.tfs.avaliasystem.Security;

import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("performanceTableSecurity")
@RequiredArgsConstructor
public class PerformanceTableSecurity {

    private final PerformanceTableRepository performanceTableRepository;

    public boolean isOwner(UUID performanceTableId, Authentication authentication) {
        UUID tutorId = UUID.fromString(authentication.getName());
        return performanceTableRepository.existsRoomTableOwnedByTutor(performanceTableId, tutorId)
                || performanceTableRepository.existsProblemTableOwnedByTutor(performanceTableId, tutorId);
    }
}
