package com.uefs.tfs.avaliasystem.US13;

import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.SelfAssessmentService;
import org.junit.jupiter.api.DisplayName;
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
class SelfAssessmentServiceTest {
    @InjectMocks private SelfAssessmentService service;
    @Mock private ProblemRepository problemRepository;
    @Mock private AssessmentRepository assessmentRepository;
    @Mock private UserRepository userRepository;

    @Test
    @DisplayName("[US13] submeterNota_Aberto_Sucesso")
    void submeterNota_Aberto_Sucesso() {
        UUID studentId = UUID.randomUUID();
        User student = new User();
        student.setId(studentId);
        
        Problem p = new Problem();
        p.setSelfAssessmentReleased(true);
        
        when(problemRepository.findById(any())).thenReturn(Optional.of(p));
        when(userRepository.findById(any())).thenReturn(Optional.of(student));
        when(assessmentRepository.findByProblemIdAndEvaluatorIdAndTargetId(any(), any(), any())).thenReturn(Optional.empty());
        
        service.submitSelfAssessment(UUID.randomUUID(), studentId, new AssessmentRequest(null, 8.5, "Boa"));
        
        verify(assessmentRepository).save(any(Assessment.class));
    }

    @Test
    @DisplayName("[US13] submeterNota_Fechado_LancaAccessDenied")
    void submeterNota_Fechado_LancaAccessDenied() {
        Problem p = new Problem();
        p.setSelfAssessmentReleased(false);
        
        when(problemRepository.findById(any())).thenReturn(Optional.of(p));
        
        assertThrows(AccessDeniedException.class, () -> 
            service.submitSelfAssessment(UUID.randomUUID(), UUID.randomUUID(), new AssessmentRequest(null, 8.5, "Boa"))
        );
        verify(assessmentRepository, never()).save(any());
    }
}
