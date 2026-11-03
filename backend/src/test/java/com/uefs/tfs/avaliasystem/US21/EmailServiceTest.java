package com.uefs.tfs.avaliasystem.US21;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.service.EmailService;
import com.uefs.tfs.avaliasystem.service.EmailTemplateService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@SpringBootTest
@TestConfig
class EmailServiceTest {

    private static final String SEND_EMAIL_TO = "joaocarlosrodrigues307@gmail.com"; // se ce quiser testar, troque para o seu email
    private static final String SUBJECT = "Teste de redefinição de senha";

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Value("${app.password-reset-url}")
    private String passwordResetUrl;

    @Test
    void shouldSendPasswordResetTemplateToMyEmail() throws Exception {
        String resetLink = UriComponentsBuilder.fromUriString(passwordResetUrl)
                .queryParam("token", "email-test-token")
                .build()
                .encode()
                .toUriString();
        String body = emailTemplateService.render(
                "password-reset",
                Map.of("passwordResetUrl", resetLink)
        );

        emailService.sendEmail(SEND_EMAIL_TO, SUBJECT, body, true);
    }
}