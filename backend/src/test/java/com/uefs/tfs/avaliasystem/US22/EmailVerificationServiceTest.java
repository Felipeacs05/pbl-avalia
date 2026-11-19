package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.exception.EmailAlreadyVerifiedException;
import com.uefs.tfs.avaliasystem.model.EmailVerificationToken;
import com.uefs.tfs.avaliasystem.model.SingleUsageToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.EmailVerificationTokenRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailService;
import com.uefs.tfs.avaliasystem.service.EmailTemplateService;
import com.uefs.tfs.avaliasystem.service.EmailVerificationService;
import com.uefs.tfs.avaliasystem.service.SingleUsageTokenService;
import com.uefs.tfs.avaliasystem.service.UserService;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("[US22] Testes Unitários de EmailVerificationService")
class EmailVerificationServiceTest {

    @InjectMocks
    private EmailVerificationService emailVerificationService;

    @Mock
    private EmailService emailService;

    @Mock
    private EmailTemplateService emailTemplateService;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SingleUsageTokenService singleUsageTokenService;

    @Mock
    private UserService userService;

    @Mock
    private ResourceLoader resourceLoader;

    @Mock
    private Resource resource;

    private User testUser;
    private SingleUsageToken testToken15min;
    private SingleUsageToken testToken20min;
    private SingleUsageToken testToken10min;
    private SingleUsageToken testToken5min;
    private SingleUsageToken testTokenExpired;

    private static final String BASE_VERIFICATION_URL = "https://avalia.uefs.br/verify-email";

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setName("Maria Silva");
        testUser.setEmail("maria.silva@uefs.br");
        testUser.setPassword("senhaCriptografada123");
        testUser.setTokenVersion(1);
        testUser.setEmailVerified(false);

        testToken15min = new SingleUsageToken(UUID.randomUUID().toString(), Instant.now().plus(15, ChronoUnit.MINUTES));
        testToken10min = new SingleUsageToken(UUID.randomUUID().toString(), Instant.now().plus(10, ChronoUnit.MINUTES));
        testToken20min = new SingleUsageToken(UUID.randomUUID().toString(), Instant.now().plus(20, ChronoUnit.MINUTES));
        testToken5min = new SingleUsageToken(UUID.randomUUID().toString(), Instant.now().plus(5, ChronoUnit.MINUTES));
        testTokenExpired = new SingleUsageToken(UUID.randomUUID().toString(), Instant.now().minus(1, ChronoUnit.MINUTES));

        ReflectionTestUtils.setField(emailVerificationService, "emailVerificationUrl", BASE_VERIFICATION_URL);
    }

    @Nested
    @DisplayName("[US22] Envio Inicial de Verificação no Cadastro")
    class SendVerificationScenarios {

        @Test
        @DisplayName("[US22] Deve disparar e-mail no cadastro contendo link com o token gerado e formato HTML")
        void sendVerification_NewUser_SendsEmailWithGeneratedToken() throws MessagingException {
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.empty());
            when(singleUsageTokenService.generateToken(any())).thenReturn(testToken15min);

            when(emailTemplateService.render(eq("email-verify"), anyMap()))
                    .thenAnswer(invocation -> {
                        Map<String, String> values = invocation.getArgument(1);
                        return "<html><body><a href=\"" + values.get("emailVerificationUrl") + "\">Confirmar</a></body></html>";
                    });

            emailVerificationService.requestEmailVerification(testUser);

            ArgumentCaptor<EmailVerificationToken> tokenCaptor = ArgumentCaptor.forClass(EmailVerificationToken.class);
            verify(emailVerificationTokenRepository).save(tokenCaptor.capture());

            EmailVerificationToken savedToken = tokenCaptor.getValue();
            assertNotNull(savedToken.getToken(), "O token gerado não deve ser nulo");
            assertEquals(testUser, savedToken.getUser(), "O token deve estar vinculado ao usuário correto");
            assertFalse(savedToken.isUsed(), "O novo token deve nascer não utilizado");
            assertTrue(savedToken.getExpiryDate().isAfter(Instant.now()), "O token deve ter validade futura");

            verify(emailService, times(1)).sendEmail(
                    eq(testUser.getEmail()),
                    eq("Verificação de email"),
                    argThat(body -> body.contains("?token=" + savedToken.getToken().getToken())),
                    eq(true)
            );
        }

        @Test
        @DisplayName("[US22] Deve invalidar o token anterior ativo caso o usuário já possua um")
        void sendVerification_UserWithPreviousToken_InvalidatesPreviousToken() throws MessagingException {
            SingleUsageToken oldSut = new SingleUsageToken("token-antigo-123", Instant.now().plus(15, ChronoUnit.MINUTES));
            EmailVerificationToken oldToken = new EmailVerificationToken(testUser, oldSut);
            oldToken.setId(10L);
            oldToken.setUsed(false);

            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.of(oldToken));
            when(singleUsageTokenService.generateToken(any())).thenReturn(testToken15min);

            when(emailTemplateService.render(eq("email-verify"), anyMap()))
                    .thenReturn("<html>Link</html>");

            emailVerificationService.requestEmailVerification(testUser);

            verify(singleUsageTokenService).invalidate(oldSut);
            verify(emailVerificationTokenRepository).save(argThat(token ->
                    !token.getToken().getToken().equals("token-antigo-123") && token.getUser().equals(testUser)));
        }
    }

    @Nested
    @DisplayName("[US22] Confirmação de E-mail (verify)")
    class VerifyScenarios {

        @Test
        @DisplayName("[US22] Deve marcar emailVerified=true e token used=true quando o token for válido e o mais recente")
        void verify_ValidToken_MarksEmailVerifiedAndTokenUsed() {
            EmailVerificationToken token = new EmailVerificationToken(
                    testUser,
                    testToken15min
            );
            token.setId(100L);
            token.setUsed(false);

            when(emailVerificationTokenRepository.findByToken(testToken15min.getToken()))
                    .thenReturn(Optional.of(token));
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.of(token));

            emailVerificationService.verify(token);

            assertTrue(testUser.isEmailVerified(), "O campo emailVerified deve se tornar true");
            verify(singleUsageTokenService, times(1)).consume(testToken15min);
        }

        @Test
        @DisplayName("[US22] Deve lançar IllegalArgumentException quando o token não for encontrado")
        void verify_NonExistentToken_ThrowsIllegalArgumentException() {
            when(emailVerificationTokenRepository.findByToken("token-inexistente"))
                    .thenReturn(Optional.empty());
            testToken15min.setToken("token-inexistente");
            EmailVerificationToken tokenInexistente = new EmailVerificationToken(testUser, testToken15min);

            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> emailVerificationService.verify(tokenInexistente)
            );

            assertEquals("Token inválido ou expirado.", ex.getMessage(),
                    "A mensagem de erro deve seguir rigorosamente a especificação");
        }

        @Test
        @DisplayName("[US22] Deve lançar IllegalArgumentException quando o token já tiver sido utilizado")
        void verify_AlreadyUsedToken_ThrowsIllegalArgumentException() {
            SingleUsageToken usedSut = new SingleUsageToken("token-ja-usado", Instant.now().plus(15, ChronoUnit.MINUTES));
            usedSut.setUsed(true);
            EmailVerificationToken usedToken = new EmailVerificationToken(
                    testUser,
                    usedSut
            );
            usedToken.setId(1L);

            when(emailVerificationTokenRepository.findByToken("token-ja-usado"))
                    .thenReturn(Optional.of(usedToken));

            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> emailVerificationService.verify(usedToken)
            );

            assertEquals("Token inválido ou expirado.", ex.getMessage());
        }

        @Test
        @DisplayName("[US22] Deve lançar IllegalArgumentException quando o token estiver expirado")
        void verify_ExpiredToken_ThrowsIllegalArgumentException() {
            EmailVerificationToken expiredToken = new EmailVerificationToken(
                    testUser,
                    testTokenExpired
            );
            expiredToken.setId(2L);

            when(emailVerificationTokenRepository.findByToken(testTokenExpired.getToken()))
                    .thenReturn(Optional.of(expiredToken));

            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> emailVerificationService.verify(expiredToken)
            );

            assertEquals("Token inválido ou expirado.", ex.getMessage());
        }

        @Test
        @DisplayName("[US22] Deve lançar IllegalArgumentException quando o token não for o mais recente gerado para o usuário")
        void verify_NotLatestTokenForUser_ThrowsIllegalArgumentException() {
            EmailVerificationToken oldToken = new EmailVerificationToken(
                    testUser,
                    testToken15min
            );
            oldToken.setId(5L);

            EmailVerificationToken latestToken = new EmailVerificationToken(
                    testUser,
                    testToken5min
            );
            latestToken.setId(6L);

            when(emailVerificationTokenRepository.findByToken(testToken15min.getToken()))
                    .thenReturn(Optional.of(oldToken));
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.of(latestToken));

            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> emailVerificationService.verify(oldToken)
            );

            assertEquals("Token inválido ou expirado.", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("[US22] Reenvio de E-mail de Verificação (resend)")
    class ResendVerificationScenarios {

        @Test
        @DisplayName("[US22] Não deve enviar e-mail nem lançar erro quando o usuário for nulo")
        void resendVerification_NullUser_DoesNotSendEmailAndDoesNotThrow() throws MessagingException {
            assertDoesNotThrow(() -> emailVerificationService.resendEmailVerification(null));

            verifyNoInteractions(emailService);
        }

        @Test
        @DisplayName("[US22] Deve lançar EmailAlreadyVerifiedException quando a conta já estiver verificada")
        void resendVerification_AlreadyVerifiedEmail_ThrowsEmailAlreadyVerifiedException() {
            testUser.setEmailVerified(true);

            assertThrows(EmailAlreadyVerifiedException.class, () -> {
                emailVerificationService.resendEmailVerification(testUser);
            });
            verifyNoInteractions(emailService);
        }

        @Test
        @DisplayName("[US22] Deve disparar novo e-mail quando a conta estiver pendente e após o período de cooldown")
        void resendVerification_UnverifiedEmail_SendsNewEmailAfterCooldown() throws MessagingException {
            testUser.setEmailVerified(false);
            SingleUsageToken oldSut = new SingleUsageToken("old-token-xyz", Instant.now().plus(20, ChronoUnit.MINUTES));
            oldSut.setCreatedAt(Instant.now().minus(2, ChronoUnit.MINUTES));
            EmailVerificationToken activeOldToken = new EmailVerificationToken(testUser, oldSut);
            activeOldToken.setId(20L);

            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
            when(singleUsageTokenService.generateToken(any())).thenReturn(testToken15min);
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.of(activeOldToken));

            when(emailTemplateService.render(eq("email-verify"), anyMap()))
                    .thenReturn("<html>Link de Reenvio</html>");

            emailVerificationService.resendEmailVerification(testUser);

            verify(emailService, times(1)).sendEmail(
                    eq(testUser.getEmail()),
                    eq("Verificação de email"),
                    anyString(),
                    eq(true)
            );
        }
    }

    @Nested
    @DisplayName("[QA] Renderização de Template de E-mail (EmailTemplateService)")
    class TemplateRenderingScenarios {

        @Test
        @DisplayName("[QA] Deve escapar o caractere '&' para '&amp;' na URL do e-mail para manter conformidade HTML")
        void template_Render_EscapesAmpersandInUrl() throws Exception {
            EmailTemplateService templateService = new EmailTemplateService(resourceLoader);
            String htmlTemplate = "<p>Clique para verificar: <a href=\"{{emailVerificationUrl}}\">Link</a></p>";

            when(resourceLoader.getResource("classpath:templates/email/email-verify.html")).thenReturn(resource);
            when(resource.getInputStream()).thenReturn(new ByteArrayInputStream(htmlTemplate.getBytes(StandardCharsets.UTF_8)));

            String rawUrl = "https://avalia.uefs.br/verify-email?token=abc-123&source=web&attempt=1";

            String renderedHtml = templateService.render(
                    "email-verify",
                    Map.of("emailVerificationUrl", rawUrl)
            );

            assertThat(renderedHtml).contains("token=abc-123&amp;source=web&amp;attempt=1");
            assertThat(renderedHtml).doesNotContain("token=abc-123&source=web");
        }

        @Test
        @DisplayName("[QA] Deve lançar IllegalArgumentException quando houver marcador sobrando sem substituição")
        void template_RenderWithRemainingPlaceholder_ThrowsIllegalArgumentException() throws Exception {
            EmailTemplateService templateService = new EmailTemplateService(resourceLoader);
            String brokenTemplate = "<a href=\"{{emailVerificationUrl}}\">Link</a><span>{{marcadorNaoFornecido}}</span>";

            when(resourceLoader.getResource("classpath:templates/email/email-verify.html")).thenReturn(resource);
            when(resource.getInputStream()).thenReturn(new ByteArrayInputStream(brokenTemplate.getBytes(StandardCharsets.UTF_8)));

            assertThrows(
                    IllegalArgumentException.class,
                    () -> templateService.render("email-verify", Map.of("emailVerificationUrl", "https://avalia.uefs.br/verify-email?token=123"))
            );
        }

    }
}