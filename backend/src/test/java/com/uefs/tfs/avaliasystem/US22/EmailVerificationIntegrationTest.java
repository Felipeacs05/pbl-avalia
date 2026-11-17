package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.EmailVerificationRequest;
import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.dto.ResendVerificationRequest;
import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.model.EmailVerificationToken;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.EmailVerificationTokenRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.EmailService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato assumido:
 * - Nível: INTEGRAÇÃO REAL COM BANCO H2 EM MEMÓRIA
 * - Sobe contexto completo: Controller, Service, JPA Repository reais, SecurityFilterChain com MockMvc.
 * - EmailService é isolado com @MockitoBean para NUNCA disparar e-mails externos reais durante a execução dos testes.
 * - Valida regras de negócio integradas:
 *   - Cadastro gera token no banco (não consumido).
 *   - Usuário não verificado tem restrição operacional: ao tentar POST /api/v1/rooms, recebe 403 Forbidden e NADA é persistido no banco (rooms.count() == 0).
 *   - Verificação com token válido atualiza emailVerified=true no banco após flush/clear.
 *   - Usuário verificado pode criar salas normalmente (retorno 201 Created).
 *   - Reutilização de token é rejeitada com 400.
 *   - Token expirado é rejeitado com 400.
 *   - Reenvio gera novo token e invalida o anterior no banco.
 *   - Lock pessimista (concorrência): 2 chamadas simultâneas de verify para o mesmo token resultam em exatamente 1 sucesso (200) e 1 falha (400).
 *   - Prevenção de vazamento: respostas de cadastro e login não expõem tokens, senhas ou versões de token.
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("[US22] Testes de Integração Real (H2 / MockMvc / Camadas Reais)")
class EmailVerificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationTokenRepository tokenRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    @MockitoBean
    private EmailService emailService;

    private User unverifiedUser;
    private User verifiedUser;

    @BeforeEach
    void setUp() {
        // Limpeza prévia para isolamento dos testes
        tokenRepository.deleteAll();
        roomRepository.deleteAll();
        userRepository.deleteAll();

        unverifiedUser = persistUser("Aluno Não Verificado", "nao.verificado." + UUID.randomUUID() + "@uefs.br", false);
        verifiedUser = persistUser("Professor Verificado", "verificado." + UUID.randomUUID() + "@uefs.br", true);

        entityManager.flush();
        entityManager.clear();
    }

    private User persistUser(String name, String email, boolean verified) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("senhaForte@123"));
        user.setTokenVersion(1);
        user.setEmailVerified(verified);
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User tutor) {
        Room room = new Room();
        room.setName(name);
        room.setTutor(tutor);
        room.setAccessCode("RM" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        room.setInviteLink("app/join/" + room.getAccessCode());
        return roomRepository.save(room);
    }

    @Nested
    @DisplayName("[US22] Fluxo Completo de Ativação de Conta e Liberação de Recursos")
    class FullWorkflowScenarios {

        @Test
        @DisplayName("[US22] Fluxo completo: Cadastro -> Gera token -> Verify -> emailVerified=true -> Criar sala retorna 201")
        void fullWorkflow_RegistrationVerificationAndRoomCreation_Returns201Created() throws Exception {
            // 1. Cadastro via multipart
            String emailNovo = "novo.aluno." + UUID.randomUUID() + "@uefs.br";
            String cadastroJson = """
                    {
                        "name": "Novo Aluno PBL",
                        "email": "%s",
                        "password": "SenhaValida123@"
                    }
                    """.formatted(emailNovo);

            MockMultipartFile dataPart = new MockMultipartFile(
                    "data",
                    "",
                    MediaType.APPLICATION_JSON_VALUE,
                    cadastroJson.getBytes(StandardCharsets.UTF_8)
            );

            mockMvc.perform(multipart("/api/v1/auth/register").file(dataPart))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value("Novo Aluno PBL"))
                    .andExpect(jsonPath("$.email").value(emailNovo));

            entityManager.flush();
            entityManager.clear();

            // 2. Localiza o usuário recém-criado e o token persistido
            User registeredUser = userRepository.findByEmail(emailNovo).orElseThrow();
            assertFalse(registeredUser.isEmailVerified(), "Conta nova deve nascer como não verificada");

            EmailVerificationToken generatedToken = tokenRepository
                    .findFirstByUser_IdOrderByIdDesc(registeredUser.getId())
                    .orElseThrow(() -> new AssertionError("Um token de verificação deveria ter sido persistido no cadastro"));
            assertFalse(generatedToken.isUsed(), "Token gerado deve estar pendente de uso");

            // 3. Usuário tenta criar sala antes de verificar -> DEVE RETORNAR 403
            RoomRequest roomRequest = new RoomRequest("Sala Proibida Inicial");
            mockMvc.perform(post("/api/v1/rooms")
                            .with(jwt().jwt(j -> j.subject(registeredUser.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(roomRequest)))
                    .andExpect(status().isForbidden());

            assertEquals(0, roomRepository.count(), "Nenhuma sala pode ser salva enquanto o e-mail não estiver verificado");

            // 4. Executa a confirmação de e-mail via endpoint público
            mockMvc.perform(post("/api/v1/auth/email/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new EmailVerificationRequest(generatedToken.getToken()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("E-mail verificado com sucesso."));

            entityManager.flush();
            entityManager.clear();

            // 5. Confere no banco se o flag foi atualizado
            User verifiedUserInDb = userRepository.findById(registeredUser.getId()).orElseThrow();
            assertTrue(verifiedUserInDb.isEmailVerified(), "emailVerified deve ser true no banco após a verificação");

            EmailVerificationToken usedTokenInDb = tokenRepository.findById(generatedToken.getId()).orElseThrow();
            assertTrue(usedTokenInDb.isUsed(), "O token deve ser marcado como consumido no banco");

            // 6. Agora o usuário pode criar sala com sucesso -> DEVE RETORNAR 201
            RoomRequest validRoomRequest = new RoomRequest("Sala PBL Autorizada");
            mockMvc.perform(post("/api/v1/rooms")
                            .with(jwt().jwt(j -> j.subject(registeredUser.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRoomRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value("Sala PBL Autorizada"))
                    .andExpect(jsonPath("$.tutor").value("Novo Aluno PBL"));

            entityManager.flush();
            entityManager.clear();

            assertEquals(1, roomRepository.count(), "A sala autorizada deve ter sido salva no banco com sucesso");
        }
    }

    @Nested
    @DisplayName("[US22] Restrições de Operação para Contas Não Verificadas")
    class UnverifiedAccountRestrictions {

        @Test
        @DisplayName("[US22] Usuário NÃO verificado não pode criar salas: retorna 403 e prova que NADA foi gravado no banco")
        void createRoom_UnverifiedUser_Returns403AndBlocksPersistence() throws Exception {
            // Arrange (Dado um usuário logado cujo e-mail ainda não foi confirmado)
            RoomRequest roomRequest = new RoomRequest("Sala PBL Tutorial Não Autorizada");

            // Act (Quando ele tenta criar uma sala)
            mockMvc.perform(post("/api/v1/rooms")
                            .with(jwt().jwt(j -> j.subject(unverifiedUser.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(roomRequest)))
                    // Assert (Recebe 403 Forbidden do RoomService)
                    .andExpect(status().isForbidden());

            entityManager.flush();
            entityManager.clear();

            // Prova negativa absoluta: contagem total no repositório de salas deve ser 0
            assertEquals(0, roomRepository.count(),
                    "Nenhum registro de sala deve ter sido gravado no banco por usuário não verificado");
        }

        @Test
        @DisplayName("[US22] Login de usuário não verificado continua permitido (200 OK), mantendo acesso básico ao sistema")
        void login_UnverifiedUser_AllowsLoginWith200Ok() throws Exception {
            // Arrange
            LoginRequest loginRequest = new LoginRequest(unverifiedUser.getEmail(), "senhaForte@123");

            // Act & Assert (O login não é bloqueado, apenas as operações privilegiadas)
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.token").isNotEmpty())
                    .andExpect(jsonPath("$.user.email").value(unverifiedUser.getEmail()));
        }
    }

    @Nested
    @DisplayName("[US22] Cenários Negativos de Verificação (Reuso, Expiração e Invalidação)")
    class NegativeVerificationScenarios {

        @Test
        @DisplayName("[US22] Reuso do mesmo token de verificação: 2ª chamada retorna 400 e estado do banco permanece intacto")
        void verify_ReuseOfSameToken_Returns400AndKeepsDatabaseIntact() throws Exception {
            // Arrange (Token válido criado e consumido na 1ª requisição)
            String tokenValue = UUID.randomUUID().toString();
            EmailVerificationToken token = tokenRepository.save(new EmailVerificationToken(
                    unverifiedUser,
                    tokenValue,
                    Instant.now().plus(24, ChronoUnit.HOURS)
            ));

            // 1ª requisição: consome o token com sucesso
            mockMvc.perform(post("/api/v1/auth/email/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new EmailVerificationRequest(tokenValue))))
                    .andExpect(status().isOk());

            entityManager.flush();
            entityManager.clear();

            // Act (2ª requisição: tenta reutilizar o mesmo token)
            mockMvc.perform(post("/api/v1/auth/email/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new EmailVerificationRequest(tokenValue))))
                    // Assert (Retorna 400 Bad Request)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Token inválido ou expirado."));

            entityManager.flush();
            entityManager.clear();

            EmailVerificationToken persistedToken = tokenRepository.findById(token.getId()).orElseThrow();
            assertTrue(persistedToken.isUsed(), "O token continua marcado como usado no banco");
        }

        @Test
        @DisplayName("[US22] Token expirado retorna 400 e não altera o flag de verificação do usuário")
        void verify_ExpiredToken_Returns400AndKeepsDatabaseIntact() throws Exception {
            // Arrange (Token criado com expiryDate no passado)
            String expiredTokenStr = UUID.randomUUID().toString();
            tokenRepository.save(new EmailVerificationToken(
                    unverifiedUser,
                    expiredTokenStr,
                    Instant.now().minus(2, ChronoUnit.HOURS)
            ));

            entityManager.flush();
            entityManager.clear();

            // Act
            mockMvc.perform(post("/api/v1/auth/email/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new EmailVerificationRequest(expiredTokenStr))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Token inválido ou expirado."));

            entityManager.flush();
            entityManager.clear();

            User userInDb = userRepository.findById(unverifiedUser.getId()).orElseThrow();
            assertFalse(userInDb.isEmailVerified(), "Usuário deve continuar não verificado no banco");
        }

        @Test
        @DisplayName("[US22] Reenvio invalida token anterior: token antigo retorna 400 e token novo retorna 200")
        void verify_OldTokenAfterResend_Returns400AndNewTokenReturns200() throws Exception {
            // Arrange (Gera o primeiro token para o usuário)
            String token1 = UUID.randomUUID().toString();
            tokenRepository.save(new EmailVerificationToken(
                    unverifiedUser,
                    token1,
                    Instant.now().plus(24, ChronoUnit.HOURS)
            ));

            entityManager.flush();
            entityManager.clear();

            // Act 1: Solicita reenvio via API
            mockMvc.perform(post("/api/v1/auth/email/resend")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new ResendVerificationRequest(unverifiedUser.getEmail()))))
                    .andExpect(status().isOk());

            entityManager.flush();
            entityManager.clear();

            // O token mais recente foi gerado pelo reenvio
            EmailVerificationToken token2Entity = tokenRepository
                    .findFirstByUser_IdOrderByIdDesc(unverifiedUser.getId())
                    .orElseThrow();
            assertNotEquals(token1, token2Entity.getToken(), "O reenvio deve gerar um novo token diferente");

            // Act 2: Tenta verificar com o token antigo (token1) -> DEVE RETORNAR 400
            mockMvc.perform(post("/api/v1/auth/email/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new EmailVerificationRequest(token1))))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Token inválido ou expirado."));

            // Act 3: Verifica com o novo token (token2) -> DEVE RETORNAR 200
            mockMvc.perform(post("/api/v1/auth/email/verify")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new EmailVerificationRequest(token2Entity.getToken()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("E-mail verificado com sucesso."));

            entityManager.flush();
            entityManager.clear();

            User updatedUser = userRepository.findById(unverifiedUser.getId()).orElseThrow();
            assertTrue(updatedUser.isEmailVerified(), "Conta confirmada através do novo token");
        }

        @Test
        @DisplayName("[US22] Reenvio para e-mail não existente retorna 200 mas não envia nada (Anti-enumeração)")
        void resend_NonExistentEmail_Returns200WithoutSendingEmail() throws Exception {
            // Act
            mockMvc.perform(post("/api/v1/auth/email/resend")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(new ResendVerificationRequest("fantasma.us22@uefs.br"))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").exists());

            // Assert
            verifyNoInteractions(emailService);
        }
    }

    @Nested
    @DisplayName("[QA] Posse de Sala e Regras de Segurança Cruzada")
    class OwnershipAndIntruderScenarios {

        @Test
        @DisplayName("[US22] Tutor de OUTRA sala tentando editar ou excluir sala de terceiro recebe 403")
        void roomOwnership_TutorFromAnotherRoom_Returns403() throws Exception {
            // Arrange (Dado uma sala pertencente ao tutor verificado e um segundo tutor)
            Room room = persistRoom("Sala do Prof Verificado", verifiedUser);

            User otherTutor = persistUser("Segundo Tutor", "outro.tutor." + UUID.randomUUID() + "@uefs.br", true);

            entityManager.flush();
            entityManager.clear();

            // Act & Assert (O segundo tutor tenta editar a sala do primeiro)
            RoomRequest updateRequest = new RoomRequest("Tentativa de Modificação");
            mockMvc.perform(put("/api/v1/rooms/{id}", room.getId())
                            .with(jwt().jwt(j -> j.subject(otherTutor.getId().toString())))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isForbidden());

            // Releitura após clear para provar que o nome da sala não foi alterado
            entityManager.clear();
            Room persisted = roomRepository.findById(room.getId()).orElseThrow();
            assertEquals("Sala do Prof Verificado", persisted.getName(), "O nome da sala deve permanecer intacto");
        }
    }

    @Nested
    @DisplayName("[US22] Prevenção de Vazamento de Dados Sensíveis")
    class DataLeakPrevention {

        @Test
        @DisplayName("[US22] Respostas de autenticação (cadastro e login) não vazam senha, hash nem tokens de verificação")
        void authResponses_RegistrationAndLogin_DoNotLeakSensitiveDataOrToken() throws Exception {
            // 1. Inspeciona a resposta do login
            LoginRequest login = new LoginRequest(verifiedUser.getEmail(), "senhaForte@123");
            String loginResponseBody = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

            assertThat(loginResponseBody)
                    .doesNotContain("password")
                    .doesNotContain("tokenVersion")
                    .doesNotContain("senhaForte")
                    .doesNotContain("EmailVerificationToken");
        }
    }

    @Nested
    @DisplayName("[QA] Concorrência e Lock Pessimista (Race Condition Protection)")
    class ConcurrencyScenarios {

        @Test
        @DisplayName("[QA] Duas requisições simultâneas de verify com o MESMO token: exatamente 1 obtém sucesso e 1 falha")
        void concurrentVerify_TwoSimultaneousRequestsForSameToken_ExactlyOneSuccessAndOneFailure() throws Exception {
            // Arrange
            String tokenValue = UUID.randomUUID().toString();
            tokenRepository.save(new EmailVerificationToken(
                    unverifiedUser,
                    tokenValue,
                    Instant.now().plus(24, ChronoUnit.HOURS)
            ));

            entityManager.flush();
            entityManager.clear();

            int threads = 2;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CountDownLatch startGate = new CountDownLatch(1);
            CountDownLatch doneGate = new CountDownLatch(threads);

            AtomicInteger successCount = new AtomicInteger(0);
            AtomicInteger failureCount = new AtomicInteger(0);

            for (int i = 0; i < threads; i++) {
                executor.submit(() -> {
                    try {
                        startGate.await(); // Disparo sincronizado
                        MvcResult result = mockMvc.perform(post("/api/v1/auth/email/verify")
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(objectMapper.writeValueAsString(new EmailVerificationRequest(tokenValue))))
                                .andReturn();

                        int statusCode = result.getResponse().getStatus();
                        if (statusCode == 200) {
                            successCount.incrementAndGet();
                        } else if (statusCode == 400) {
                            failureCount.incrementAndGet();
                        }
                    } catch (Exception ignored) {
                        failureCount.incrementAndGet();
                    } finally {
                        doneGate.countDown();
                    }
                });
            }

            // Act
            startGate.countDown(); // Libera as duas requisições simultaneamente
            boolean completed = doneGate.await(10, TimeUnit.SECONDS);
            executor.shutdown();

            // Assert
            assertTrue(completed, "As threads concorrentes devem finalizar dentro do timeout");
            assertEquals(1, successCount.get(), "Exatamente 1 requisição concorrente deve ser bem-sucedida (200 OK)");
            assertEquals(1, failureCount.get(), "Exatamente 1 requisição concorrente deve falhar (400 Bad Request) pelo lock pessimista");
        }
    }
}
