package com.uefs.tfs.avaliasystem.US12;

import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.service.AssessmentReleaseService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssessmentReleaseServiceTest {
    
    @InjectMocks private AssessmentReleaseService service;
    @Mock private ProblemRepository problemRepository;

    @Nested
    @DisplayName("Validos")
    class Validos {
        @Test
        @DisplayName("[US12] alternarChave_TutorAciona_DeveInverterFlagESalvar")
        void alternarChave_TutorAciona_DeveInverterFlagESalvar() {
            UUID tutorId = UUID.randomUUID();
            User tutor = new User();
            tutor.setId(tutorId);
            Room room = new Room();
            room.setTutor(tutor);
            
            Problem p = new Problem();
            p.setRoom(room);
            p.setSelfAssessmentReleased(false);
            
            when(problemRepository.findById(any())).thenReturn(Optional.of(p));
            when(problemRepository.save(any())).thenReturn(p);
            
            service.toggleSelfAssessment(UUID.randomUUID(), tutorId);
            
            assertThat(p.getSelfAssessmentReleased()).isTrue();
            verify(problemRepository).save(p);
        }
    }
    
    @Nested
    @DisplayName("Invalidos")
    class Invalidos {
        @Test
        @DisplayName("[US12] alternarChave_NaoTutorAciona_LancaExcecao")
        void alternarChave_NaoTutorAciona_LancaExcecao() {
            UUID tutorId = UUID.randomUUID();
            UUID nonTutorId = UUID.randomUUID();
            User tutor = new User();
            tutor.setId(tutorId);
            Room room = new Room();
            room.setTutor(tutor);
            
            Problem p = new Problem();
            p.setRoom(room);
            
            when(problemRepository.findById(any())).thenReturn(Optional.of(p));
            
            assertThrows(AccessDeniedException.class, () -> service.toggleSelfAssessment(UUID.randomUUID(), nonTutorId));
            verify(problemRepository, never()).save(any());
        }
    }
}
