package com.uefs.tfs.avaliasystem.US23;

import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Contrato assumido:
 * - Entidade: User
 *   - name: String (nullable = false)
 *   - profilePictureUrl: String (nullable = true)
 *   - tokenVersion: int (nullable = false, default 0)
 *   - email: String (nullable = false, unique = true, não editável)
 * - Repository: UserRepository
 *   - save, findById, findByEmail
 */
@DataJpaTest
@DisplayName("[US23] Testes de Repositório de UserRepository para Edição de Perfil")
class UserProfileRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setName("Aluno Original");
        testUser.setEmail("aluno.perfil." + UUID.randomUUID().toString().substring(0, 8) + "@uefs.br");
        testUser.setPassword("senhaCriptografada123");
        testUser.setTokenVersion(1);
        testUser.setProfilePictureUrl("/fotosPerfil/antiga.jpg");
        testUser = entityManager.persistFlushFind(testUser);
    }

    @Test
    @DisplayName("[US23] save deve persistir a atualização de name e profilePictureUrl e sobreviver ao clear do EntityManager")
    void save_UpdatedNameAndProfilePictureUrl_PersistsAndSurvivesContextClear() {
        // Arrange (Dado uma alteração em nome e foto de perfil)
        testUser.setName("Aluno com Nome Novo");
        testUser.setProfilePictureUrl("/fotosPerfil/nova_foto.png");

        // Act (Salva através do repositório)
        userRepository.save(testUser);

        // Força sincronização com H2 e limpa o cache de primeiro nível
        entityManager.flush();
        entityManager.clear();

        // Assert (Recarrega diretamente do banco)
        Optional<User> found = userRepository.findById(testUser.getId());
        assertTrue(found.isPresent(), "O usuário deve ser encontrado no banco");
        assertEquals("Aluno com Nome Novo", found.get().getName(), "O nome atualizado deve persistir no banco");
        assertEquals("/fotosPerfil/nova_foto.png", found.get().getProfilePictureUrl(), "A URL da nova foto deve persistir");
        assertEquals(testUser.getEmail(), found.get().getEmail(), "O e-mail deve permanecer intocado");
    }

    @Test
    @DisplayName("[US23] save deve persistir o incremento de tokenVersion para revogação de tokens JWT anteriores")
    void save_IncrementedTokenVersion_PersistsNewVersionAndSurvivesContextClear() {
        // Arrange (Dado o incremento de tokenVersion)
        int previousVersion = testUser.getTokenVersion();
        testUser.setTokenVersion(previousVersion + 1);

        // Act
        userRepository.save(testUser);
        entityManager.flush();
        entityManager.clear();

        // Assert (Releitura do banco deve trazer a nova versão)
        User reloaded = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals(previousVersion + 1, reloaded.getTokenVersion(),
                "A nova versão do token deve estar persistida fisicamente na coluna token_version");
    }

    @Test
    @DisplayName("[US23] Atualizações de perfil não devem alterar a unicidade nem o valor do e-mail original")
    void save_ProfileUpdate_PreservesOriginalEmailUnchanged() {
        // Arrange
        String originalEmail = testUser.getEmail();
        testUser.setName("Nome Qualquer");

        // Act
        userRepository.save(testUser);
        entityManager.flush();
        entityManager.clear();

        // Assert
        User reloaded = userRepository.findByEmail(originalEmail).orElseThrow();
        assertEquals(originalEmail, reloaded.getEmail(), "O e-mail do usuário não deve ser modificado nas edições de perfil");
    }
}
