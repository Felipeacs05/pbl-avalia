package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.exception.EmailAlreadyVerifiedException;
import com.uefs.tfs.avaliasystem.exception.ResourceNotFoundException;
import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.EmailVerificationTokenRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.mail.MessagingException;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor()
public class EmailVerificationService {
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;
    private final SingleUsageTokenService singleUsageTokenService;
    private final UserRepository userRepository;
    private int RESEND_COOLDOWN_MINUTES = 1;
    private final EmailService emailService;
    private final EmailTemplateService emailTemplateService;
    private final Duration expiration = Duration.ofMinutes(15);
    @Value("${app.email-verification-url}")
    private String emailVerificationUrl;

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

        emailVerificationTokenRepository
                .findFirstByUser_IdOrderByIdDesc(user.getId())
                .ifPresent(previousToken -> {
                    singleUsageTokenService.invalidate(
                            previousToken.getToken()
                    );
                });

        SingleUsageToken token =
                singleUsageTokenService.generateToken(expiration);

        EmailVerificationToken emailVerificationToken =
                new EmailVerificationToken(user, token);

        emailVerificationTokenRepository.save(emailVerificationToken);

        return token.getToken();
    }

    public void verify(EmailVerificationToken token) {
        EmailVerificationToken verificationToken =
                findValidLatestToken(token.getToken().toString(), true); // lock token tb garante atomicidade na operacao de
        verificationToken.getUser().setEmailVerified(true);

        singleUsageTokenService.consume(
                verificationToken.getToken()
        );
    }

    @Transactional
    public void verify(String token) {
        EmailVerificationToken verificationToken =
                findValidLatestToken(token, true);

        verificationToken.getUser().setEmailVerified(true);

        singleUsageTokenService.consume(
                verificationToken.getToken()
        );
    }

    private EmailVerificationToken findValidLatestToken(
            String token,
            boolean lockToken
    ) {
        EmailVerificationToken verificationToken = emailVerificationTokenRepository
                .findByToken(token)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Token inválido ou expirado."
                        )
                );

        SingleUsageToken singleUsageToken = verificationToken.getToken();

        if (lockToken) {
            singleUsageTokenService.findValidTokenForUpdate(singleUsageToken.getToken());
        }

        if (!singleUsageToken.isValid()) {
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }

        boolean isLatest = emailVerificationTokenRepository
                .findFirstByUser_IdOrderByIdDesc(
                        verificationToken.getUser().getId()
                )
                .map(latestToken ->
                        latestToken.getId().equals(verificationToken.getId())
                )
                .orElse(false);

        if (!isLatest) {
            throw new IllegalArgumentException(
                    "Token inválido ou expirado."
            );
        }

        return verificationToken;
    }

    @Transactional
    public void requestEmailVerification(User user) throws MessagingException {

        if (user == null) {
            return;
        }

        String token = generateToken(user.getId());

        String subject = "Verificação de email";

        String resetLink = UriComponentsBuilder.fromUriString(emailVerificationUrl)
                .queryParam("token", token)
                .build()
                .encode()
                .toUriString();

        String body = emailTemplateService.render(
                "email-verify",
                Map.of("emailVerificationUrl", resetLink)
        );

        emailService.sendEmail(user.getEmail(), subject, body, true);
    }

    @Transactional
    public void resendEmailVerification(User user) throws MessagingException {

        if (user == null) {
            return;
        }

        if (user.isEmailVerified()) {
            throw new EmailAlreadyVerifiedException("Esse email já foi verificado.");
        }

        EmailVerificationToken latestToken = emailVerificationTokenRepository
                .findFirstByUser_IdOrderByIdDesc(user.getId())
                .orElse(null);

        if (latestToken != null) {
            Instant blockedUntil = latestToken.getCreationDate()
                    .plus(RESEND_COOLDOWN_MINUTES, ChronoUnit.MINUTES);

            if (Instant.now().isBefore(blockedUntil)) {
                throw new IllegalStateException("Tente novamente em " +
                        Duration.between(Instant.now(), blockedUntil).toSeconds() +
                        " segundos.");
            }
        }

        String token = generateToken(user.getId());

        // 5. Monta o e-mail
        String subject = "Verificação de email";
        String resetLink = UriComponentsBuilder.fromUriString(emailVerificationUrl)
                .queryParam("token", token)
                .build()
                .encode()
                .toUriString();
        String body = emailTemplateService.render(
                "email-verify",
                Map.of("emailVerificationUrl", resetLink)
        );

        emailService.sendEmail(user.getEmail(), subject, body, true);
    }

}