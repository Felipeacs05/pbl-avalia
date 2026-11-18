package com.uefs.tfs.avaliasystem.US22;

import com.uefs.tfs.avaliasystem.model.EmailVerificationToken;
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

/**
 * Contrato assumido:
 * - Entidade: EmailVerificationToken
 *   - id: Long (IDENTITY)
 *   - token: String (nullable = false, unique = true)
 *   - user: User (ManyToOne, fetch = FetchType.EAGER, nullable = false, name = "user_id")
 *   - expiryDate: Instant (nullable = false)
 *   - used: boolean (nullable = false)
 * - Repository: EmailVerificationTokenRepository
 *   - findByToken(String token): busca simples por token.
 *   - findFirstByUser_IdOrderByIdDesc(UUID userId): busca o token mais recente gerado para o usuário (maior ID).
 *   - findByTokenForUpdate(String token): busca com lock pessimista (PESSIMISTIC_WRITE) para evitar race condition no verify.
 */
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
        // Arrange (Dado um token salvo no banco)
        String tokenStr = UUID.randomUUID().toString();
        EmailVerificationToken token = new EmailVerificationToken(
                testUser,
                tokenStr,
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        token = entityManager.persistFlushFind(token);

        // Força sincronização e limpa cache de primeiro nível
        entityManager.flush();
        entityManager.clear();

        // Act (Quando busca pelo método anotado com PESSIMISTIC_WRITE)
        Optional<EmailVerificationToken> found = tokenRepository.findByTokenForUpdate(tokenStr);

        // Assert (Então a entidade é carregada com todos os relacionamentos)
        assertTrue(found.isPresent(), "O token persistido deve ser encontrado");
        assertEquals(token.getId(), found.get().getId());
        assertEquals(tokenStr, found.get().getToken());
        assertEquals(testUser.getId(), found.get().getUser().getId());
        assertFalse(found.get().isUsed());
    }

    @Test
    @DisplayName("[US22] findFirstByUser_IdOrderByIdDesc deve retornar o token de maior ID quando houver múltiplos para o mesmo usuário")
    void findFirstByUser_IdOrderByIdDesc_MultipleTokens_ReturnsLatestToken() {
        // Arrange (Dado que dois tokens foram emitidos sucessivamente para o mesmo usuário)
        EmailVerificationToken firstToken = new EmailVerificationToken(
                testUser,
                "primeiro-token-" + UUID.randomUUID(),
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        firstToken = entityManager.persistFlushFind(firstToken);

        EmailVerificationToken secondToken = new EmailVerificationToken(
                testUser,
                "segundo-token-" + UUID.randomUUID(),
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        secondToken = entityManager.persistFlushFind(secondToken);

        entityManager.flush();
        entityManager.clear();

        // Act (Quando busca o token mais recente do usuário)
        Optional<EmailVerificationToken> latest = tokenRepository.findFirstByUser_IdOrderByIdDesc(testUser.getId());

        // Assert (O de maior ID — segundoToken — deve ser o retornado)
        assertTrue(latest.isPresent());
        assertEquals(secondToken.getId(), latest.get().getId(),
                "Deve retornar o último token gerado pelo usuário para anular tokens anteriores");
        assertEquals(secondToken.getToken(), latest.get().getToken());
    }

    @Test
    @DisplayName("[US22] save deve violar unicidade (DataIntegrityViolationException) se houver tentativa de gravar o mesmo token")
    void save_DuplicateToken_ThrowsDataIntegrityViolationException() {
        // Arrange (Dado que um token já existe no banco)
        String tokenShared = "token-unico-123";
        EmailVerificationToken token1 = new EmailVerificationToken(
                testUser,
                tokenShared,
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        entityManager.persistAndFlush(token1);

        // Usuário secundário tentando gravar o mesmo token
        User anotherUser = new User();
        anotherUser.setName("Outro Aluno");
        anotherUser.setEmail("outro." + UUID.randomUUID().toString().substring(0, 8) + "@uefs.br");
        anotherUser.setPassword("senha456");
        anotherUser = entityManager.persistFlushFind(anotherUser);

        EmailVerificationToken token2 = new EmailVerificationToken(
                anotherUser,
                tokenShared,
                Instant.now().plus(24, ChronoUnit.HOURS)
        );

        // Act & Assert (O flush deve falhar com violação de integridade por causa da constraint UNIQUE)
        assertThrows(DataIntegrityViolationException.class, () -> {
            tokenRepository.save(token2);
            entityManager.flush();
        }, "A constraint UNIQUE na coluna token deve impedir valores duplicados");
    }

    @Test
    @DisplayName("[US22] findByToken deve retornar Optional vazio para token não existente")
    void findByToken_NonExistentToken_ReturnsEmptyOptional() {
        // Act & Assert
        Optional<EmailVerificationToken> result = tokenRepository.findByToken("token-inexistente-12345");
        assertTrue(result.isEmpty(), "Deve retornar vazio para tokens desconhecidos");
    }
}
