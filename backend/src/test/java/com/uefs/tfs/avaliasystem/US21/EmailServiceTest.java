// backend/src/test/java/com/uefs/tfs/avaliasystem/US21/PasswordRecoveryIntegrationTest.java
package com.uefs.tfs.avaliasystem.US21;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest

public class EmailServiceTest {

    @Autowired
    private EmailService emailService;


    private String SEND_EMAIL_TO = "joaocarlosrodrigues307@gmail.com";
    private String SUBJECT = "email enviado do avaliapbl";

    private String BODY = " \n" +
            "<!DOCTYPE html>\n" +
            "<html lang=\"en\">\n" +
            "<head>\n" +
            "    <meta charset=\"UTF-8\">\n" +
            "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
            "    <title>SMTP Test</title>\n" +
            "</head>\n" +
            "<body style=\"margin:0; padding:30px; background-color:#f4f4f4; font-family:Arial,sans-serif;\">\n" +
            "    <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px; margin:auto; background:#ffffff; border-radius:8px;\">\n" +
            "        <tr>\n" +
            "            <td style=\"padding:30px; text-align:center;\">\n" +
            "                <h1 style=\"color:#202b36;\">SMTP Test Successful!</h1>\n" +
            "                <p style=\"color:#555; font-size:16px;\">\n" +
            "                   se ce ta lendo essa msg ent o email foi enviado c sucesso\n" +
            "                </p>\n" +
            "                <hr style=\"border:0; border-top:1px solid #ddd; margin:25px 0;\">\n" +
            "                <p style=\"color:#777; font-size:13px;\">\n" +
            "                    This is an automated test message.\n" +
            "                </p>\n" +
            "                <p style=\"color:#999; font-size:12px;\">\n" +
            "                    Sent at: {{ timestamp }}\n" +
            "                </p>\n" +
            "            </td>\n" +
            "        </tr>\n" +
            "    </table>\n" +
            "</body>\n" +
            "</html>";


    @Test
    void sendEmailtoMyselfTest() throws Exception {
        emailService.sendEmail(SEND_EMAIL_TO, SUBJECT, BODY);
    }
}