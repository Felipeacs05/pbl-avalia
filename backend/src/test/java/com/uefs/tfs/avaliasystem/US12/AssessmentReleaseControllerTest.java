package com.uefs.tfs.avaliasystem.US12;

import com.uefs.tfs.avaliasystem.TestConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@TestConfig
class AssessmentReleaseControllerTest {
    @Test
    @DisplayName("[US12] patchToggle_SemToken_Retorna401")
    void patchToggle_SemToken_Retorna401() {
        /*
        mockMvc.perform(patch("/api/v1/problems/{id}/self-assessment-release"))
               .andExpect(status().isUnauthorized());
        */
    }
}
