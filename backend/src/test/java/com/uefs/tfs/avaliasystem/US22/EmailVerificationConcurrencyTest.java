package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.EmailVerificationRequest;
import com.uefs.tfs.avaliasystem.model.EmailVerificationToken;
import com.uefs.tfs.avaliasystem.model.SingleUsageToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.EmailVerificationTokenRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@DisplayName("[QA][US22] Concorrência e Lock Pessimista na Verificação de E-mail")
class EmailVerificationConcurrencyTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationTokenRepository tokenRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String tokenValue;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        roomRepository.deleteAll();
        userRepository.deleteAll();

        User user = new User();
        user.setName("Aluno Concorrente");
        user.setEmail("concorrente." + UUID.randomUUID() + "@uefs.br");
        user.setPassword(passwordEncoder.encode("senhaForte@123"));
        user.setTokenVersion(1);
        user.setEmailVerified(false);
        user = userRepository.save(user);

        tokenValue = UUID.randomUUID().toString();
        tokenRepository.save(new EmailVerificationToken(
                user,
                new SingleUsageToken(tokenValue, Instant.now().plus(24, ChronoUnit.HOURS))
        ));
    }

    @AfterEach
    void tearDown() {
        roomRepository.deleteAll();
        tokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("[QA] Duas requisições simultâneas de verify com o MESMO token: exatamente 1 obtém sucesso e 1 falha")
    void concurrentVerify_TwoSimultaneousRequestsForSameToken_ExactlyOneSuccessAndOneFailure() throws Exception {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch doneGate = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    startGate.await();
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

        startGate.countDown();
        boolean completed = doneGate.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "As threads concorrentes devem finalizar dentro do timeout");
        assertEquals(1, successCount.get(), "Exatamente 1 requisição concorrente deve ser bem-sucedida (200 OK)");
        assertEquals(1, failureCount.get(), "Exatamente 1 requisição concorrente deve falhar (400 Bad Request) pelo lock pessimista");
    }
}
