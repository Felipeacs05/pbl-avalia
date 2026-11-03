package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.PasswordResetTokenRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class PasswordResetService {

    private final EmailService emailService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailTemplateService emailTemplateService;
    private final Duration expiration = Duration.ofMinutes(15);
    @Value("${app.password-reset-url}")
    private String passwordResetUrl;

    public PasswordResetService(
            EmailService emailService,
            PasswordResetTokenRepository passwordResetTokenRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailTemplateService emailTemplateService
    ) {
        this.emailService = emailService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailTemplateService = emailTemplateService;
    }

    @Transactional
    public String generateToken(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(id)
                .ifPresent(previousToken -> {
                    previousToken.setUsed(true);
                    passwordResetTokenRepository.save(previousToken);
                });

        Instant expiresAt = Instant.now().plus(expiration);
        String token = UUID.randomUUID().toString();

        PasswordResetToken passwordResetToken = new PasswordResetToken(user, token, expiresAt);
        passwordResetTokenRepository.save(passwordResetToken);

        return token;
    }


    @Transactional
    public String generateToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(user.getId())
                .ifPresent(previousToken -> {
                    previousToken.setUsed(true);
                    passwordResetTokenRepository.save(previousToken);
                });

        Instant expiresAt = Instant.now().plus(expiration);
        String token = UUID.randomUUID().toString();

        PasswordResetToken passwordResetToken = new PasswordResetToken(user, token, expiresAt);
        passwordResetTokenRepository.save(passwordResetToken);

        return token;
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = findValidLatestToken(token, true);

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }

    @Transactional
    public void requestPasswordReset(String email) throws MessagingException {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return;
        }

        String token = generateToken(user.getId());
        String subject = "Redefinição de Senha";
        String resetLink = UriComponentsBuilder.fromUriString(passwordResetUrl)
                .queryParam("token", token)
                .build()
                .encode()
                .toUriString();
        String body = emailTemplateService.render(
                "password-reset",
                Map.of("passwordResetUrl", resetLink)
        );
        emailService.sendEmail(user.getEmail(), subject, body, true);
    }

    public UUID extractUserId(String token) {
        try {
            return findValidLatestToken(token, false).getUser().getId();
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    public boolean isTokenValid(String token) {
        try {
            findValidLatestToken(token, false);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    public boolean isTokenValid(String token, UUID expectedId) {
        if (expectedId == null) {
            return false;
        }
        try {
            return expectedId.equals(findValidLatestToken(token, false).getUser().getId());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    public long getExpirationTime() {
        return expiration.toMillis();
    }


    //o lock token é justamente pra aql cenário de 2 requisições simultaneas sob o mesmo token, onde uma delas ta marcando o token como usado
    // e a outra ta lendo o token enquanto ele é marcado como usado, levando a 2 usos de 1 só token
    private PasswordResetToken findValidLatestToken(String token, boolean lockToken) {
        PasswordResetToken resetToken = (lockToken
                ? passwordResetTokenRepository.findByTokenForUpdate(token)
                : passwordResetTokenRepository.findByToken(token))
                .filter(PasswordResetToken::isValid)
                .orElseThrow(() -> new IllegalArgumentException("Token inválido ou expirado."));
        //verifica se essa token é a ultima token gerada por esse usuário
        boolean isLatest = passwordResetTokenRepository
                .findFirstByUser_IdOrderByIdDesc(resetToken.getUser().getId())
                .map(latestToken -> latestToken.getId().equals(resetToken.getId()))
                .orElse(false);
        if (!isLatest) {
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }
        return resetToken;
    }
}
