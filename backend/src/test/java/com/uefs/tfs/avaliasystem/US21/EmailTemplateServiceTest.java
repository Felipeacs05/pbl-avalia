package com.uefs.tfs.avaliasystem.US21;

import com.uefs.tfs.avaliasystem.service.EmailTemplateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailTemplateServiceTest {

    @Mock
    private ResourceLoader resourceLoader;

    @Mock
    private Resource resource;

    private EmailTemplateService emailTemplateService;

    @BeforeEach
    void setUp() {
        emailTemplateService = new EmailTemplateService(resourceLoader);
    }

    @Test
    void shouldCacheTemplateAndRenderEachRequestWithItsOwnValues() throws Exception {
        String templateHtml = "<a href=\"{{passwordResetUrl}}\">Reset</a>";
        when(resourceLoader.getResource("classpath:templates/email/password-reset.html")).thenReturn(resource);
        when(resource.getInputStream()).thenAnswer(invocation ->
                new ByteArrayInputStream(templateHtml.getBytes(StandardCharsets.UTF_8)));

        String firstEmail = emailTemplateService.render(
                "password-reset",
                Map.of("passwordResetUrl", "https://example.test/reset?token=first&source=email")
        );
        String secondEmail = emailTemplateService.render(
                "password-reset",
                Map.of("passwordResetUrl", "https://example.test/reset?token=second")
        );

        assertTrue(firstEmail.contains("token=first&amp;source=email"));
        assertTrue(secondEmail.contains("token=second"));
        assertFalse(secondEmail.contains("token=first"));
        verify(resourceLoader, times(1)).getResource("classpath:templates/email/password-reset.html");
        verify(resource, times(1)).getInputStream();
    }
}
