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

    public boolean isRoomTutor(UUID performanceTableId, Authentication authentication) {
       return performanceTableRepository.existsByIdAndRoomTutorId(performanceTableId, UUID.fromString(authentication.getName()));
    }


    public boolean isRoomParticipantOrTutor(UUID performanceTableId, Authentication authentication) {
        return performanceTableRepository.existsAccessibleByIdAndUserId(performanceTableId, UUID.fromString(authentication.getName()));
    }
}
