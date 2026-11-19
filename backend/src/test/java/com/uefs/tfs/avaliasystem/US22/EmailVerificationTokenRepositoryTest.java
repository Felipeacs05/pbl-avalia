package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.model.EmailVerificationToken;
import com.uefs.tfs.avaliasystem.model.SingleUsageToken;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.EmailVerificationTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@DisplayName("[US22] Testes de Repositório de EmailVerificationTokenRepository")
class EmailVerificationTokenRepositoryTest {

    @Autowired
    private EmailVerificationTokenRepository tokenRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setName("Aluno Teste JPA");
        testUser.setEmail("aluno.jpa." + UUID.randomUUID().toString().substring(0, 8) + "@uefs.br");
        testUser.setPassword("senhaSegura123");
        testUser = entityManager.persistFlushFind(testUser);
    }

    @Test
    @DisplayName("[US22] findByTokenForUpdate deve carregar a entidade persistida correspondente ao token")
    void findByTokenForUpdate_ValidToken_ReturnsPersistedTokenWithLock() {
        String tokenStr = UUID.randomUUID().toString();
        SingleUsageToken sut = new SingleUsageToken(
                tokenStr,
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        EmailVerificationToken token = new EmailVerificationToken(
                testUser,
                sut
        );
        token = entityManager.persistFlushFind(token);

        entityManager.flush();
        entityManager.clear();

        Optional<EmailVerificationToken> found = tokenRepository.findByTokenForUpdate(tokenStr);

        assertTrue(found.isPresent(), "O token persistido deve ser encontrado");
        assertEquals(token.getId(), found.get().getId());
        assertEquals(tokenStr, found.get().getToken().getToken());
        assertEquals(testUser.getId(), found.get().getUser().getId());
        assertFalse(found.get().isUsed());
    }

    @Test
    @DisplayName("[US22] findFirstByUser_IdOrderByIdDesc deve retornar o token de maior ID quando houver múltiplos para o mesmo usuário")
    void findFirstByUser_IdOrderByIdDesc_MultipleTokens_ReturnsLatestToken() {
        SingleUsageToken sut1 = new SingleUsageToken(
                "primeiro-token-" + UUID.randomUUID(),
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        EmailVerificationToken firstToken = new EmailVerificationToken(
                testUser,
                sut1
        );
        firstToken = entityManager.persistFlushFind(firstToken);

        SingleUsageToken sut2 = new SingleUsageToken(
                "segundo-token-" + UUID.randomUUID(),
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        EmailVerificationToken secondToken = new EmailVerificationToken(
                testUser,
                sut2
        );
        secondToken = entityManager.persistFlushFind(secondToken);

        entityManager.flush();
        //entityManager.clear();

        Optional<EmailVerificationToken> latest = tokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId());

        assertTrue(latest.isPresent());
        assertEquals(secondToken.getId(), latest.get().getId(),
                "Deve retornar o último token gerado pelo usuário para anular tokens anteriores");
        assertEquals(secondToken.getToken().getToken(), latest.get().getToken().getToken());
    }

    @Test
    @DisplayName("[US22] save deve violar unicidade (DataIntegrityViolationException) se houver tentativa de gravar o mesmo token")
    void save_DuplicateToken_ThrowsDataIntegrityViolationException() {
        String tokenShared = "token-unico-123";
        SingleUsageToken sut1 = new SingleUsageToken(
                tokenShared,
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        EmailVerificationToken token1 = new EmailVerificationToken(
                testUser,
                sut1
        );
        entityManager.persistAndFlush(token1);

        User anotherUser = new User();
        anotherUser.setName("Outro Aluno");
        anotherUser.setEmail("outro." + UUID.randomUUID().toString().substring(0, 8) + "@uefs.br");
        anotherUser.setPassword("senha456");
        anotherUser = entityManager.persistFlushFind(anotherUser);

        SingleUsageToken sut2 = new SingleUsageToken(
                tokenShared,
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        EmailVerificationToken token2 = new EmailVerificationToken(
                anotherUser,
                sut2
        );

        assertThrows(DataIntegrityViolationException.class, () -> {
            tokenRepository.save(token2);
            entityManager.flush();
        }, "A constraint UNIQUE na coluna token deve impedir valores duplicados");
    }

    @Test
    @DisplayName("[US22] findByToken deve retornar Optional vazio para token não existente")
    void findByToken_NonExistentToken_ReturnsEmptyOptional() {
        Optional<EmailVerificationToken> result = tokenRepository.findByToken("token-inexistente-12345");
        assertTrue(result.isEmpty(), "Deve retornar vazio para tokens desconhecidos");
    }
}
