
package com.uefs.tfs.avaliasystem.US21;

import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
import com.uefs.tfs.avaliasystem.model.SingleUsageToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.PasswordResetTokenRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailService;
import com.uefs.tfs.avaliasystem.service.EmailTemplateService;
import com.uefs.tfs.avaliasystem.service.PasswordResetService;
import com.uefs.tfs.avaliasystem.service.SingleUsageTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.mail.MessagingException;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @InjectMocks
    private PasswordResetService passwordResetService;

    @Mock
    private EmailService emailService;

    @Mock
    private EmailTemplateService emailTemplateService;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SingleUsageTokenService singleUsageTokenService;

    private User testUser;

    private SingleUsageToken testToken;

    private Instant thirtyMinutes;
    private Instant tenMinutes;
    private Instant fifteenMinutes;
    private Instant fiveMinutesAgo;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setName("User Test");
        testUser.setEmail("user@test.com");
        testUser.setPassword("encodedOldPassword");
        testUser.setTokenVersion(1);

        ReflectionTestUtils.setField(
                passwordResetService,
                "passwordResetUrl",
                "https://example.test/reset-password"
        );

        Instant now = Instant.now();

        thirtyMinutes = now.plus(30, ChronoUnit.MINUTES);
        tenMinutes = now.plus(10, ChronoUnit.MINUTES);
        fifteenMinutes = now.plus(15, ChronoUnit.MINUTES);
        fiveMinutesAgo = now.minus(5, ChronoUnit.MINUTES);

        testToken = new SingleUsageToken(
                UUID.randomUUID().toString(),
                thirtyMinutes
        );

        // Simulate the behavior of the real SingleUsageTokenService.
        doAnswer(invocation -> {
            SingleUsageToken token = invocation.getArgument(0);
            token.setUsed(true);
            return null;
        }).when(singleUsageTokenService).invalidate(any());

        doAnswer(invocation -> {
            SingleUsageToken token = invocation.getArgument(0);
            token.setUsed(true);
            return null;
        }).when(singleUsageTokenService).consume(any());
    }

    @Test
    void shouldGenerateTokenAndInvalidatePreviousActiveTokens() {

        SingleUsageToken oldSingleUsageToken = new SingleUsageToken(
                "old-token",
                tenMinutes
        );

        PasswordResetToken oldToken = new PasswordResetToken(
                testUser,
                oldSingleUsageToken
        );

        oldToken.setId(1L);

        when(userRepository.findById(testUser.getId()))
                .thenReturn(Optional.of(testUser));

        when(passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(
                testUser.getId()
        )).thenReturn(Optional.of(oldToken));

        when(singleUsageTokenService.generateToken(any(Duration.class)))
                .thenReturn(testToken);

        String token = passwordResetService.generateToken(testUser.getId());

        assertNotNull(token);
        assertEquals(testToken.getToken(), token);
        assertTrue(oldToken.isUsed());

        verify(singleUsageTokenService).invalidate(oldSingleUsageToken);

        verify(passwordResetTokenRepository).save(argThat(savedToken ->
                token.equals(savedToken.getToken())
                        && savedToken.getUser().equals(testUser)
        ));
    }

    @Test
    void shouldSendEmailWithLinkContainingGeneratedToken() throws MessagingException {

        when(userRepository.findByEmail(testUser.getEmail()))
                .thenReturn(Optional.of(testUser));

        when(userRepository.findById(testUser.getId()))
                .thenReturn(Optional.of(testUser));

        when(passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(
                testUser.getId()
        )).thenReturn(Optional.empty());

        when(singleUsageTokenService.generateToken(any(Duration.class)))
                .thenReturn(testToken);

        when(emailTemplateService.render(eq("password-reset"), anyMap()))
                .thenAnswer(invocation -> {
                    Map<String, String> values = invocation.getArgument(1);

                    return "<a href=\"" + values.get("passwordResetUrl")
                            + "\">Redefinir senha</a>";
                });

        passwordResetService.requestPasswordReset(testUser.getEmail());

        verify(emailService).sendEmail(
                eq(testUser.getEmail()),
                eq("Redefinição de Senha"),
                argThat(body -> body.contains(
                        "https://example.test/reset-password?token="
                )),
                eq(true)
        );

        verify(emailTemplateService).render(
                eq("password-reset"),
                argThat(values -> values.get("passwordResetUrl")
                        .startsWith(
                                "https://example.test/reset-password?token="
                        ))
        );
    }

    @Test
    void shouldResetPasswordSuccessfullyAndIncrementTokenVersion() {

        PasswordResetToken resetToken = new PasswordResetToken(
                testUser,
                testToken
        );

        resetToken.setId(2L);

        when(passwordResetTokenRepository.findByToken(testToken.getToken()))
                .thenReturn(Optional.of(resetToken));

        when(singleUsageTokenService.findValidTokenForUpdate(
                testToken.getToken()
        )).thenReturn(testToken);

        when(passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(
                testUser.getId()
        )).thenReturn(Optional.of(resetToken));

        when(passwordEncoder.encode("newStrongPassword"))
                .thenReturn("encodedNewPassword");

        passwordResetService.resetPassword(
                testToken.getToken(),
                "newStrongPassword"
        );

        assertEquals("encodedNewPassword", testUser.getPassword());
        assertEquals(2, testUser.getTokenVersion());
        assertTrue(resetToken.isUsed());

        verify(userRepository).save(testUser);
        verify(singleUsageTokenService).consume(testToken);
    }

    @Test
    void shouldThrowExceptionWhenTokenNotFound() {

        when(passwordResetTokenRepository.findByToken("non-existing-token"))
                .thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword(
                        "non-existing-token",
                        "newPassword"
                )
        );

        assertEquals(
                "Token inválido ou expirado.",
                exception.getMessage()
        );

        verify(userRepository, never()).save(any());
        verify(singleUsageTokenService, never())
                .findValidTokenForUpdate(anyString());
    }

    @Test
    void shouldRejectTokenWhenItIsNotTheLatestForTheUser() {

        String oldTokenValue = "older-token";

        SingleUsageToken oldSingleUsageToken = new SingleUsageToken(
                oldTokenValue,
                fifteenMinutes
        );

        SingleUsageToken latestSingleUsageToken = new SingleUsageToken(
                "latest-token",
                fifteenMinutes
        );

        PasswordResetToken oldToken = new PasswordResetToken(
                testUser,
                oldSingleUsageToken
        );

        oldToken.setId(1L);

        PasswordResetToken latestToken = new PasswordResetToken(
                testUser,
                latestSingleUsageToken
        );

        latestToken.setId(2L);

        when(passwordResetTokenRepository.findByToken(oldTokenValue))
                .thenReturn(Optional.of(oldToken));

        when(singleUsageTokenService.findValidTokenForUpdate(oldTokenValue))
                .thenReturn(oldSingleUsageToken);

        when(passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(
                testUser.getId()
        )).thenReturn(Optional.of(latestToken));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword(
                        oldTokenValue,
                        "newPassword"
                )
        );

        assertEquals(
                "Token inválido ou expirado.",
                exception.getMessage()
        );

        verify(userRepository, never()).save(any());
        verify(singleUsageTokenService, never()).consume(any());
    }

    @Test
    void shouldThrowExceptionWhenTokenIsAlreadyUsed() {

        String tokenStr = "used-token";

        SingleUsageToken usedSingleUsageToken = new SingleUsageToken(
                tokenStr,
                fifteenMinutes
        );

        usedSingleUsageToken.setUsed(true);

        PasswordResetToken resetToken = new PasswordResetToken(
                testUser,
                usedSingleUsageToken
        );

        when(passwordResetTokenRepository.findByToken(tokenStr))
                .thenReturn(Optional.of(resetToken));

        when(singleUsageTokenService.findValidTokenForUpdate(tokenStr))
                .thenThrow(new IllegalArgumentException(
                        "Token inválido ou expirado."
                ));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword(
                        tokenStr,
                        "newPassword"
                )
        );

        assertEquals(
                "Token inválido ou expirado.",
                exception.getMessage()
        );

        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldThrowExceptionWhenTokenIsExpired() {

        String tokenStr = "expired-token";

        SingleUsageToken expiredSingleUsageToken = new SingleUsageToken(
                tokenStr,
                fiveMinutesAgo
        );

        PasswordResetToken resetToken = new PasswordResetToken(
                testUser,
                expiredSingleUsageToken
        );

        when(passwordResetTokenRepository.findByToken(tokenStr))
                .thenReturn(Optional.of(resetToken));

        when(singleUsageTokenService.findValidTokenForUpdate(tokenStr))
                .thenThrow(new IllegalArgumentException(
                        "Token inválido ou expirado."
                ));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword(
                        tokenStr,
                        "newPassword"
                )
        );

        assertEquals(
                "Token inválido ou expirado.",
                exception.getMessage()
        );

        verify(userRepository, never()).save(any());
    }
}
