package com.uefs.tfs.avaliasystem.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    @Autowired
    private JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String fromEmailId;

    public void sendEmail(String toEmail, String subject, String body, Boolean isHtml) throws MessagingException {

       MimeMessage mimeMessage = javaMailSender.createMimeMessage();
       MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");


        helper.setFrom(fromEmailId);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(body, isHtml);


        javaMailSender.send(mimeMessage);

    }
}
