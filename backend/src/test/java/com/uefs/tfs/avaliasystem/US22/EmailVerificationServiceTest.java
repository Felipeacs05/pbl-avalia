package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.model.EmailVerificationToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.EmailVerificationTokenRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailService;
import com.uefs.tfs.avaliasystem.service.EmailTemplateService;
import com.uefs.tfs.avaliasystem.service.EmailVerificationService;
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

/**
 * Contrato assumido:
 * - Serviço: EmailVerificationService
 *   - sendVerification(User user): gera token de 24h, invalida tokens anteriores do usuário, renderiza template "email-verification" e envia via EmailService.
 *   - verify(String token): valida token com lock pessimista (findByTokenForUpdate), confere se é o mais recente, se não foi usado e se não expirou;
 *     atualiza user.emailVerified = true e token.used = true; lança IllegalArgumentException("Token inválido ou expirado.").
 *   - resendVerification(String email): busca usuário por e-mail; se inexistente ou já verificado, encerra silenciosamente (anti-enumeração);
 *     se pendente, invalida token anterior e envia novo e-mail.
 * - Template de e-mail: classpath:templates/email/email-verification.html com placeholder {{emailVerificationUrl}}.
 * - URL base configurada via propriedade: app.email-verification-url.
 * - Exceções de negócio: IllegalArgumentException mapeada para 400 Bad Request.
 */
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
    private ResourceLoader resourceLoader;

    @Mock
    private Resource resource;

    private User testUser;
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

        ReflectionTestUtils.setField(emailVerificationService, "emailVerificationUrl", BASE_VERIFICATION_URL);
    }

    @Nested
    @DisplayName("[US22] Envio Inicial de Verificação no Cadastro")
    class SendVerificationScenarios {

        @Test
        @DisplayName("[US22] Deve disparar e-mail no cadastro contendo link com o token gerado e formato HTML")
        void sendVerification_NewUser_SendsEmailWithGeneratedToken() throws MessagingException {
            // Arrange (Dado um usuário recém cadastrado sem tokens anteriores)
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.empty());

            when(emailTemplateService.render(eq("email-verification"), anyMap()))
                    .thenAnswer(invocation -> {
                        Map<String, String> values = invocation.getArgument(1);
                        return "<html><body><a href=\"" + values.get("emailVerificationUrl") + "\">Confirmar</a></body></html>";
                    });

            // Act (Quando a verificação inicial é disparada)
            emailVerificationService.sendVerification(testUser);

            // Assert (Então um token é salvo e o e-mail enviado 1x com parâmetros corretos)
            ArgumentCaptor<EmailVerificationToken> tokenCaptor = ArgumentCaptor.forClass(EmailVerificationToken.class);
            verify(emailVerificationTokenRepository).save(tokenCaptor.capture());

            EmailVerificationToken savedToken = tokenCaptor.getValue();
            assertNotNull(savedToken.getToken(), "O token gerado não deve ser nulo");
            assertEquals(testUser, savedToken.getUser(), "O token deve estar vinculado ao usuário correto");
            assertFalse(savedToken.isUsed(), "O novo token deve nascer não utilizado");
            assertTrue(savedToken.getExpiryDate().isAfter(Instant.now()), "O token deve ter validade futura");

            verify(emailService, times(1)).sendEmail(
                    eq(testUser.getEmail()),
                    eq("Verificação de E-mail"),
                    argThat(body -> body.contains("?token=" + savedToken.getToken())),
                    eq(true)
            );
        }

        @Test
        @DisplayName("[US22] Deve invalidar o token anterior ativo caso o usuário já possua um")
        void sendVerification_UserWithPreviousToken_InvalidatesPreviousToken() throws MessagingException {
            // Arrange (Dado um usuário que já possuía um token ativo anterior)
            EmailVerificationToken oldToken = new EmailVerificationToken(
                    testUser,
                    "token-antigo-123",
                    Instant.now().plus(24, ChronoUnit.HOURS)
            );
            oldToken.setId(10L);
            oldToken.setUsed(false);

            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.of(oldToken));

            when(emailTemplateService.render(eq("email-verification"), anyMap()))
                    .thenReturn("<html>Link</html>");

            // Act (Quando gera um novo token de verificação)
            emailVerificationService.sendVerification(testUser);

            // Assert (Então o token anterior é marcado como used=true e persistido)
            assertTrue(oldToken.isUsed(), "O token anterior deve ser invalidado (used=true)");
            verify(emailVerificationTokenRepository).save(oldToken);

            // E um novo token é persistido
            verify(emailVerificationTokenRepository).save(argThat(token ->
                    !token.getToken().equals("token-antigo-123") && token.getUser().equals(testUser)));
        }
    }

    @Nested
    @DisplayName("[US22] Confirmação de E-mail (verify)")
    class VerifyScenarios {

        @Test
        @DisplayName("[US22] Deve marcar emailVerified=true e token used=true quando o token for válido e o mais recente")
        void verify_ValidToken_MarksEmailVerifiedAndTokenUsed() {
            // Arrange (Dado um token válido, não expirado e sendo o mais recente do usuário)
            String tokenValue = UUID.randomUUID().toString();
            EmailVerificationToken token = new EmailVerificationToken(
                    testUser,
                    tokenValue,
                    Instant.now().plus(24, ChronoUnit.HOURS)
            );
            token.setId(100L);
            token.setUsed(false);

            when(emailVerificationTokenRepository.findByTokenForUpdate(tokenValue))
                    .thenReturn(Optional.of(token));
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.of(token));

            // Act (Quando o token é validado)
            emailVerificationService.verify(tokenValue);

            // Assert (Então o usuário é atualizado para verificado e o token consumido)
            assertTrue(testUser.isEmailVerified(), "O campo emailVerified deve se tornar true");
            assertTrue(token.isUsed(), "O token deve ser marcado como used=true após o uso");
            verify(userRepository, times(1)).save(testUser);
            verify(emailVerificationTokenRepository, times(1)).save(token);
        }

        @Test
        @DisplayName("[US22] Deve lançar IllegalArgumentException quando o token não for encontrado")
        void verify_NonExistentToken_ThrowsIllegalArgumentException() {
            // Arrange (Dado um token que não existe no repositório)
            when(emailVerificationTokenRepository.findByTokenForUpdate("token-inexistente"))
                    .thenReturn(Optional.empty());

            // Act & Assert (Quando tenta verificar, deve lançar exceção exata e nada salvar)
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> emailVerificationService.verify("token-inexistente")
            );

            assertEquals("Token inválido ou expirado.", ex.getMessage(),
                    "A mensagem de erro deve seguir rigorosamente a especificação");
            verify(userRepository, never()).save(any());
            verify(emailVerificationTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US22] Deve lançar IllegalArgumentException quando o token já tiver sido utilizado")
        void verify_AlreadyUsedToken_ThrowsIllegalArgumentException() {
            // Arrange (Dado um token marcado como used=true)
            String tokenValue = "token-ja-usado";
            EmailVerificationToken usedToken = new EmailVerificationToken(
                    testUser,
                    tokenValue,
                    Instant.now().plus(24, ChronoUnit.HOURS)
            );
            usedToken.setId(1L);
            usedToken.setUsed(true);

            when(emailVerificationTokenRepository.findByTokenForUpdate(tokenValue))
                    .thenReturn(Optional.of(usedToken));

            // Act & Assert (Tentativa de reutilização deve ser bloqueada)
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> emailVerificationService.verify(tokenValue)
            );

            assertEquals("Token inválido ou expirado.", ex.getMessage());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US22] Deve lançar IllegalArgumentException quando o token estiver expirado")
        void verify_ExpiredToken_ThrowsIllegalArgumentException() {
            // Arrange (Dado um token com expiryDate no passado)
            String tokenValue = "token-expirado";
            EmailVerificationToken expiredToken = new EmailVerificationToken(
                    testUser,
                    tokenValue,
                    Instant.now().minus(1, ChronoUnit.HOURS)
            );
            expiredToken.setId(2L);
            expiredToken.setUsed(false);

            when(emailVerificationTokenRepository.findByTokenForUpdate(tokenValue))
                    .thenReturn(Optional.of(expiredToken));

            // Act & Assert (Token expirado não pode ser validado)
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> emailVerificationService.verify(tokenValue)
            );

            assertEquals("Token inválido ou expirado.", ex.getMessage());
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US22] Deve lançar IllegalArgumentException quando o token não for o mais recente gerado para o usuário")
        void verify_NotLatestTokenForUser_ThrowsIllegalArgumentException() {
            // Arrange (Dado um token antigo que ainda não expirou, mas o usuário gerou outro mais recente)
            String oldTokenValue = "token-antigo";
            EmailVerificationToken oldToken = new EmailVerificationToken(
                    testUser,
                    oldTokenValue,
                    Instant.now().plus(24, ChronoUnit.HOURS)
            );
            oldToken.setId(5L);
            oldToken.setUsed(false);

            EmailVerificationToken latestToken = new EmailVerificationToken(
                    testUser,
                    "token-mais-novo",
                    Instant.now().plus(24, ChronoUnit.HOURS)
            );
            latestToken.setId(6L);
            latestToken.setUsed(false);

            when(emailVerificationTokenRepository.findByTokenForUpdate(oldTokenValue))
                    .thenReturn(Optional.of(oldToken));
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.of(latestToken));

            // Act & Assert (O token anterior deixa de valer assim que um novo é emitido)
            IllegalArgumentException ex = assertThrows(
                    IllegalArgumentException.class,
                    () -> emailVerificationService.verify(oldTokenValue)
            );

            assertEquals("Token inválido ou expirado.", ex.getMessage());
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("[US22] Reenvio de E-mail de Verificação (resend)")
    class ResendVerificationScenarios {

        @Test
        @DisplayName("[US22] Não deve enviar e-mail nem lançar erro quando o e-mail não existir (Anti-enumeração)")
        void resendVerification_NonExistentEmail_DoesNotSendEmailAndDoesNotThrow() throws MessagingException {
            // Arrange (Dado um e-mail que não existe na base)
            when(userRepository.findByEmail("inexistente@uefs.br")).thenReturn(Optional.empty());

            // Act (Quando a API solicita reenvio)
            assertDoesNotThrow(() -> emailVerificationService.resendVerification("inexistente@uefs.br"));

            // Assert (Nenhum e-mail pode ser enviado para não revelar a ausência da conta)
            verifyNoInteractions(emailService);
            verify(emailVerificationTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US22] Não deve disparar novo e-mail quando a conta já estiver verificada")
        void resendVerification_AlreadyVerifiedEmail_DoesNotSendNewEmail() throws MessagingException {
            // Arrange (Dado um usuário que já concluiu a verificação)
            testUser.setEmailVerified(true);
            when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

            // Act (Quando tenta reenviar)
            emailVerificationService.resendVerification(testUser.getEmail());

            // Assert (Nenhum e-mail novo deve ser enviado)
            verifyNoInteractions(emailService);
            verify(emailVerificationTokenRepository, never()).save(any());
        }

        @Test
        @DisplayName("[US22] Deve invalidar token anterior e disparar novo e-mail quando a conta estiver pendente de verificação")
        void resendVerification_UnverifiedEmail_InvalidatesPreviousTokenAndSendsNewEmail() throws MessagingException {
            // Arrange (Dado um usuário com e-mail não verificado e token anterior ativo)
            testUser.setEmailVerified(false);
            EmailVerificationToken activeOldToken = new EmailVerificationToken(
                    testUser,
                    "old-token-xyz",
                    Instant.now().plus(20, ChronoUnit.HOURS)
            );
            activeOldToken.setId(20L);
            activeOldToken.setUsed(false);

            when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
            when(emailVerificationTokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId()))
                    .thenReturn(Optional.of(activeOldToken));
            when(emailTemplateService.render(eq("email-verification"), anyMap()))
                    .thenReturn("<html>Link de Reenvio</html>");

            // Act (Quando reenvia a verificação)
            emailVerificationService.resendVerification(testUser.getEmail());

            // Assert (O token anterior é invalidado e um novo e-mail é despachado)
            assertTrue(activeOldToken.isUsed(), "O token anterior precisa ser invalidado no reenvio");
            verify(emailVerificationTokenRepository).save(activeOldToken);
            verify(emailService, times(1)).sendEmail(
                    eq(testUser.getEmail()),
                    eq("Verificação de E-mail"),
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
            // Arrange (Dado o serviço real de template e um HTML de exemplo com placeholder)
            EmailTemplateService templateService = new EmailTemplateService(resourceLoader);
            String htmlTemplate = "<p>Clique para verificar: <a href=\"{{emailVerificationUrl}}\">Link</a></p>";

            when(resourceLoader.getResource("classpath:templates/email/email-verification.html")).thenReturn(resource);
            when(resource.getInputStream()).thenReturn(new ByteArrayInputStream(htmlTemplate.getBytes(StandardCharsets.UTF_8)));

            String rawUrl = "https://avalia.uefs.br/verify-email?token=abc-123&source=web&attempt=1";

            // Act (Quando o template é renderizado com a URL)
            String renderedHtml = templateService.render(
                    "email-verification",
                    Map.of("emailVerificationUrl", rawUrl)
            );

            // Assert (Então o '&' é substituído por '&amp;')
            assertThat(renderedHtml).contains("token=abc-123&amp;source=web&amp;attempt=1");
            assertThat(renderedHtml).doesNotContain("token=abc-123&source=web");
        }

        @Test
        @DisplayName("[QA] Deve lançar IllegalArgumentException quando houver marcador sobrando sem substituição")
        void template_RenderWithRemainingPlaceholder_ThrowsIllegalArgumentException() throws Exception {
            // Arrange (Dado um template com marcador extra não mapeado)
            EmailTemplateService templateService = new EmailTemplateService(resourceLoader);
            String brokenTemplate = "<a href=\"{{emailVerificationUrl}}\">Link</a><span>{{marcadorNaoFornecido}}</span>";

            when(resourceLoader.getResource("classpath:templates/email/email-verification.html")).thenReturn(resource);
            when(resource.getInputStream()).thenReturn(new ByteArrayInputStream(brokenTemplate.getBytes(StandardCharsets.UTF_8)));

            // Act & Assert (O serviço deve abortar para impedir envio de e-mails com {{...}} visíveis ao usuário)
            assertThrows(
                    IllegalArgumentException.class,
                    () -> templateService.render("email-verification", Map.of("emailVerificationUrl", "https://avalia.uefs.br/verify-email?token=123"))
            );
        }
    }
}
