package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
import com.uefs.tfs.avaliasystem.model.SingleUsageToken;
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
import java.util.Map;
import java.util.UUID;

@Service
public class PasswordResetService {

    private final EmailService emailService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailTemplateService emailTemplateService;
    private final SingleUsageTokenService singleUsageTokenService;

    private final Duration expiration = Duration.ofMinutes(15);

    @Value("${app.password-reset-url}")
    private String passwordResetUrl;

    public PasswordResetService(
            EmailService emailService,
            PasswordResetTokenRepository passwordResetTokenRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailTemplateService emailTemplateService,
            SingleUsageTokenService singleUsageTokenService
    ) {
        this.emailService = emailService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailTemplateService = emailTemplateService;
        this.singleUsageTokenService = singleUsageTokenService;
    }

    @Transactional
    public String generateToken(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("Usuário não encontrado.")
                );

        return createToken(user);
    }

    @Transactional
    public String generateToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new IllegalArgumentException("Usuário não encontrado.")
                );

        return createToken(user);
    }

    private String createToken(User user) {

        passwordResetTokenRepository
                .findFirstByUser_IdOrderByIdDesc(user.getId())
                .ifPresent(previousToken -> {
                    singleUsageTokenService.invalidate(
                            previousToken.getToken()
                    );
                });

        SingleUsageToken token =
                singleUsageTokenService.generateToken(expiration);

        PasswordResetToken passwordResetToken =
                new PasswordResetToken(user, token);

        passwordResetTokenRepository.save(passwordResetToken);

        return token.getToken();
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken =
                findValidLatestToken(token, true);

        User user = resetToken.getUser();

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);

        userRepository.save(user);

        singleUsageTokenService.consume(resetToken.getToken());
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

    @Transactional(readOnly = true)
    public UUID extractUserId(String token) {
        try {
            return findValidLatestToken(token, false)
                    .getUser()
                    .getId();
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public boolean isTokenValid(String token) {
        try {
            findValidLatestToken(token, false);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    @Transactional(readOnly = true)
    public boolean isTokenValid(String token, UUID expectedId) {
        if (expectedId == null) {
            return false;
        }

        try {
            return expectedId.equals(
                    findValidLatestToken(token, false)
                            .getUser()
                            .getId()
            );
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    public long getExpirationTime() {
        return expiration.toMillis();
    }

    private PasswordResetToken findValidLatestToken(
            String token,
            boolean lockToken
    ) {
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByToken(token)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Token inválido ou expirado."
                        )
                );

        SingleUsageToken singleUsageToken = resetToken.getToken();

        if (lockToken) {
            singleUsageTokenService.findValidTokenForUpdate(singleUsageToken.getToken());
        }

        if (!singleUsageToken.isValid()) {
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }

        boolean isLatest = passwordResetTokenRepository
                .findFirstByUser_IdOrderByIdDesc(
                        resetToken.getUser().getId()
                )
                .map(latestToken ->
                        latestToken.getId().equals(resetToken.getId())
                )
                .orElse(false);

        if (!isLatest) {
            throw new IllegalArgumentException(
                    "Token inválido ou expirado."
            );
        }

        return resetToken;
    }
}