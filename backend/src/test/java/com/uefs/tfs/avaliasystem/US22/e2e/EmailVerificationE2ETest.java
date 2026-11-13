package com.uefs.tfs.avaliasystem.US22.e2e;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.EmailVerificationRequest;
import com.uefs.tfs.avaliasystem.dto.ResendVerificationRequest;
import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.model.EmailVerificationToken;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.EmailVerificationTokenRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailService;
import com.uefs.tfs.avaliasystem.service.JwtService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

/**
 * Contrato assumido:
 * - Nível: TESTE DE PONTA A PONTA (E2E) COM TESTRESTTEMPLATE
 * - Servidor Spring Boot real rodando em porta aleatória (RANDOM_PORT).
 * - Sem anotação @Transactional (a thread do servidor de testes roda de forma independente da thread de asserção).
 * - Autenticação JWT real gerada pelo JwtService com a chave de teste.
 * - Limpeza rigorosa no @AfterEach na ordem de chaves estrangeiras (filhos -> RoomMember -> salas -> tokens -> usuários).
 * - EmailService mockado via @MockitoBean para prevenir chamadas SMTP externas.
 * - Jornadas validadas:
 *   1) Usuário não verificado tenta criar sala -> 403 Forbidden. Valida token -> 200 OK -> Cria sala com sucesso -> 201 Created.
 *   2) Reenvio de verificação invalida token anterior e ativa com novo token.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestConfig
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
@DisplayName("[US22] Testes End-to-End (E2E / TestRestTemplate / Servidor Real)")
class EmailVerificationE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationTokenRepository tokenRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @PersistenceContext
    private EntityManager entityManager;

    @MockitoBean
    private EmailService emailService;

    private TransactionTemplate transactionTemplate;

    private User unverifiedTutor;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);

        unverifiedTutor = new User();
        unverifiedTutor.setName("Tutor E2E Pendente");
        unverifiedTutor.setEmail("tutor.e2e." + UUID.randomUUID() + "@uefs.br");
        unverifiedTutor.setPassword(passwordEncoder.encode("senhaSeguraE2E@123"));
        unverifiedTutor.setTokenVersion(1);
        unverifiedTutor.setEmailVerified(false);
        unverifiedTutor = userRepository.save(unverifiedTutor);
    }

    @AfterEach
    void tearDown() {
        // Limpeza respeitando a ordem de integridade referencial
        roomRepository.deleteAll();
        transactionTemplate.executeWithoutResult(status ->
                entityManager.createQuery("DELETE FROM RoomMember").executeUpdate());
        tokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String getUrl(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpHeaders createAuthHeaders(User user) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(jwtService.generateToken(user.getId()));
        return headers;
    }

    @Test
    @DisplayName("[E2E][US22] Jornada 1: Cadastro não verificado é barrado ao criar sala (403), confirma e-mail (200) e cria sala liberada (201)")
    void fullJourney_RegistrationBlockVerificationAndRelease_WorksEndToEnd() {
        // Passo 1: Usuário não verificado tenta criar uma sala
        RoomRequest roomRequest = new RoomRequest("Sala E2E Bloqueada");
        HttpEntity<RoomRequest> unverifiedRequest = new HttpEntity<>(roomRequest, createAuthHeaders(unverifiedTutor));

        ResponseEntity<String> forbiddenResponse = restTemplate.postForEntity(
                getUrl("/api/v1/rooms"),
                unverifiedRequest,
                String.class
        );

        // Deve ser barrado com 403 Forbidden
        assertEquals(HttpStatus.FORBIDDEN, forbiddenResponse.getStatusCode(),
                "Usuário não verificado deve receber 403 Forbidden ao tentar criar salas");
        assertEquals(0, roomRepository.count(),
                "Nenhuma sala deve constar no banco de dados após a tentativa barrada");

        // Passo 2: Gera token de verificação no banco
        String tokenStr = UUID.randomUUID().toString();
        EmailVerificationToken token = new EmailVerificationToken(
                unverifiedTutor,
                tokenStr,
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        tokenRepository.save(token);

        // Passo 3: Envia requisição real de confirmação de e-mail via endpoint público
        EmailVerificationRequest verifyRequest = new EmailVerificationRequest(tokenStr);
        ResponseEntity<String> verifyResponse = restTemplate.postForEntity(
                getUrl("/api/v1/auth/email/verify"),
                verifyRequest,
                String.class
        );

        assertEquals(HttpStatus.OK, verifyResponse.getStatusCode(),
                "A confirmação com token válido deve retornar 200 OK");
        assertTrue(verifyResponse.getBody() != null && verifyResponse.getBody().contains("E-mail verificado com sucesso."));

        // Confere estado relido do banco de dados
        User confirmedUser = userRepository.findById(unverifiedTutor.getId()).orElseThrow();
        assertTrue(confirmedUser.isEmailVerified(), "O usuário deve estar como emailVerified=true no banco");

        // Passo 4: O mesmo usuário tenta novamente criar a sala
        HttpEntity<RoomRequest> authorizedRequest = new HttpEntity<>(roomRequest, createAuthHeaders(confirmedUser));
        ResponseEntity<RoomResponse> successResponse = restTemplate.postForEntity(
                getUrl("/api/v1/rooms"),
                authorizedRequest,
                RoomResponse.class
        );

        assertEquals(HttpStatus.CREATED, successResponse.getStatusCode(),
                "Após a verificação do e-mail, a criação da sala deve ser liberada com 201 Created");
        assertNotNull(successResponse.getBody());
        assertEquals("Sala E2E Bloqueada", successResponse.getBody().getName());
        assertEquals(1, roomRepository.count(),
                "Exatamente uma sala deve constar no banco após a criação bem-sucedida");
    }

    @Test
    @DisplayName("[E2E][US22] Jornada 2: Reenvio invalida o token anterior; confirmação é concluída exclusivamente com o novo token")
    void resendJourney_ResendingInvalidatesPreviousTokenAndConfirmsWithNewToken() {
        // Passo 1: Salva o primeiro token
        String firstTokenStr = UUID.randomUUID().toString();
        EmailVerificationToken firstToken = tokenRepository.save(new EmailVerificationToken(
                unverifiedTutor,
                firstTokenStr,
                Instant.now().plus(24, ChronoUnit.HOURS)
        ));

        // Passo 2: Dispara o reenvio via API
        ResendVerificationRequest resendRequest = new ResendVerificationRequest(unverifiedTutor.getEmail());
        ResponseEntity<String> resendResponse = restTemplate.postForEntity(
                getUrl("/api/v1/auth/email/resend"),
                resendRequest,
                String.class
        );

        assertEquals(HttpStatus.OK, resendResponse.getStatusCode());

        // Passo 3: Tenta verificar com o token anterior -> DEVE RETORNAR 400 BAD REQUEST
        ResponseEntity<String> oldTokenAttempt = restTemplate.postForEntity(
                getUrl("/api/v1/auth/email/verify"),
                new EmailVerificationRequest(firstTokenStr),
                String.class
        );
        assertEquals(HttpStatus.BAD_REQUEST, oldTokenAttempt.getStatusCode(),
                "O primeiro token não pode mais ser aceito após um novo ter sido solicitado");

        // Passo 4: Obtém o novo token gerado
        EmailVerificationToken latestToken = tokenRepository
                .findFirstByUser_IdOrderByIdDesc(unverifiedTutor.getId())
                .orElseThrow();
        assertNotEquals(firstToken.getId(), latestToken.getId());

        // Passo 5: Valida com o novo token -> DEVE RETORNAR 200 OK
        ResponseEntity<String> newTokenAttempt = restTemplate.postForEntity(
                getUrl("/api/v1/auth/email/verify"),
                new EmailVerificationRequest(latestToken.getToken()),
                String.class
        );
        assertEquals(HttpStatus.OK, newTokenAttempt.getStatusCode(),
                "O novo token emitido pelo reenvio deve validar a conta com sucesso");

        // Passo 6: Cria sala agora liberada
        RoomRequest roomRequest = new RoomRequest("Sala E2E Pós-Reenvio");
        ResponseEntity<RoomResponse> createResponse = restTemplate.postForEntity(
                getUrl("/api/v1/rooms"),
                new HttpEntity<>(roomRequest, createAuthHeaders(unverifiedTutor)),
                RoomResponse.class
        );
        assertEquals(HttpStatus.CREATED, createResponse.getStatusCode());
        assertEquals(1, roomRepository.count());
    }
}
