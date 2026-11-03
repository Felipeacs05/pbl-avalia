package com.uefs.tfs.avaliasystem.US21;

import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.PasswordResetTokenRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailService;
import com.uefs.tfs.avaliasystem.service.EmailTemplateService;
import com.uefs.tfs.avaliasystem.service.PasswordResetService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.mail.MessagingException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setName("User Test");
        testUser.setEmail("user@test.com");
        testUser.setPassword("encodedOldPassword");
        testUser.setTokenVersion(1);
        ReflectionTestUtils.setField(passwordResetService, "passwordResetUrl", "https://example.test/reset-password");
    }

    @Test
    void shouldGenerateTokenAndInvalidatePreviousActiveTokens() {
        PasswordResetToken oldToken = new PasswordResetToken(testUser, "old-token", Instant.now().plus(10, ChronoUnit.MINUTES));
        oldToken.setId(1L);
        oldToken.setUsed(false);

        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId())).thenReturn(Optional.of(oldToken));

        String token = passwordResetService.generateToken(testUser.getId());

        assertNotNull(token);
        assertTrue(oldToken.isUsed());
        verify(passwordResetTokenRepository).save(oldToken);
        verify(passwordResetTokenRepository).save(argThat(savedToken ->
                token.equals(savedToken.getToken()) && savedToken.getUser().equals(testUser)));
    }

    @Test
    void shouldSendEmailWithLinkContainingGeneratedToken() throws MessagingException {
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId())).thenReturn(Optional.empty());
        when(emailTemplateService.render(eq("password-reset"), anyMap()))
                .thenAnswer(invocation -> {
                    Map<String, String> values = invocation.getArgument(1);
                    return "<a href=\"" + values.get("passwordResetUrl") + "\">Redefinir senha</a>";
                });

        passwordResetService.requestPasswordReset(testUser.getEmail());

        verify(emailService).sendEmail(
                eq(testUser.getEmail()),
                eq("Redefinição de Senha"),
                argThat(body -> body.contains("https://example.test/reset-password?token=")),
                eq(true)
        );
        verify(emailTemplateService).render(eq("password-reset"), argThat(values ->
                values.get("passwordResetUrl").startsWith("https://example.test/reset-password?token=")));
    }

    @Test
    void shouldResetPasswordSuccessfullyAndIncrementTokenVersion() {
        String tokenStr = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken(testUser, tokenStr, Instant.now().plus(15, ChronoUnit.MINUTES));
        resetToken.setId(2L);

        when(passwordResetTokenRepository.findByTokenForUpdate(tokenStr)).thenReturn(Optional.of(resetToken));
        when(passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId())).thenReturn(Optional.of(resetToken));
        when(passwordEncoder.encode("newStrongPassword")).thenReturn("encodedNewPassword");

        passwordResetService.resetPassword(tokenStr, "newStrongPassword");

        assertEquals("encodedNewPassword", testUser.getPassword());
        assertEquals(2, testUser.getTokenVersion());
        assertTrue(resetToken.isUsed());
        verify(userRepository).save(testUser);
        verify(passwordResetTokenRepository).save(resetToken);
    }

    @Test
    void shouldThrowExceptionWhenTokenNotFound() {
        when(passwordResetTokenRepository.findByTokenForUpdate("non-existing-token")).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword("non-existing-token", "newPassword")
        );

        assertEquals("Token inválido ou expirado.", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldRejectTokenWhenItIsNotTheLatestForTheUser() {
        String oldTokenValue = "older-token";
        PasswordResetToken oldToken = new PasswordResetToken(
                testUser, oldTokenValue, Instant.now().plus(15, ChronoUnit.MINUTES));
        oldToken.setId(1L);
        PasswordResetToken latestToken = new PasswordResetToken(
                testUser, "latest-token", Instant.now().plus(15, ChronoUnit.MINUTES));
        latestToken.setId(2L);

        when(passwordResetTokenRepository.findByTokenForUpdate(oldTokenValue)).thenReturn(Optional.of(oldToken));
        when(passwordResetTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                .thenReturn(Optional.of(latestToken));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword(oldTokenValue, "newPassword")
        );

        assertEquals("Token inválido ou expirado.", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldThrowExceptionWhenTokenIsAlreadyUsed() {
        String tokenStr = "used-token";
        PasswordResetToken resetToken = new PasswordResetToken(testUser, tokenStr, Instant.now().plus(15, ChronoUnit.MINUTES));
        resetToken.setUsed(true);

        when(passwordResetTokenRepository.findByTokenForUpdate(tokenStr)).thenReturn(Optional.of(resetToken));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword(tokenStr, "newPassword")
        );

        assertEquals("Token inválido ou expirado.", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void shouldThrowExceptionWhenTokenIsExpired() {
        String tokenStr = "expired-token";
        PasswordResetToken resetToken = new PasswordResetToken(testUser, tokenStr, Instant.now().minus(5, ChronoUnit.MINUTES));

        when(passwordResetTokenRepository.findByTokenForUpdate(tokenStr)).thenReturn(Optional.of(resetToken));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> passwordResetService.resetPassword(tokenStr, "newPassword")
        );

        assertEquals("Token inválido ou expirado.", exception.getMessage());
        verify(userRepository, never()).save(any());
    }
}
