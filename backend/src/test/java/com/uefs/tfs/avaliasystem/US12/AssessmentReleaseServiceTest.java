package com.uefs.tfs.avaliasystem.US12;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AssessmentReleaseServiceTest {
    /*
    @InjectMocks private AssessmentReleaseService service;
    @Mock private ProblemRepository problemRepository;
    */

    @Nested
    @DisplayName("Validos")
    class Validos {
        @Test
        @DisplayName("[US12] alternarChave_TutorAciona_DeveInverterFlagESalvar")
        void alternarChave_TutorAciona_DeveInverterFlagESalvar() {
            /* Implementacao dependente de Problem.peerAssessmentReleased etc */
        }
    }
}
