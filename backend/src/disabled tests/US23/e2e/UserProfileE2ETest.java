package com.uefs.tfs.avaliasystem.US23.e2e;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.ChangePasswordRequest;
import com.uefs.tfs.avaliasystem.dto.LoginRequest;
import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.dto.UserResponse;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.JwtService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

/**
 * Contrato assumido:
 * - Nível: TESTE END-TO-END REAL COM TESTRESTTEMPLATE
 * - Servidor Spring Boot real em porta aleatória (RANDOM_PORT).
 * - Sem anotação @Transactional (a thread do servidor de testes roda separadamente).
 * - Autenticação JWT real gerada pelo JwtService.
 * - Testes de upload multipart real com envio de MultiValueMap (part "data" e part "photo").
 * - Validação do endpoint público de fotos (/fotosPerfil/**), confirmando retorno 200 e integridade dos bytes servidos.
 * - Ciclo completo de alteração de senha e novo login.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestConfig
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
@DisplayName("[US23] Testes End-to-End (E2E / TestRestTemplate / Servidor Real)")
class UserProfileE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

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

    private TransactionTemplate transactionTemplate;

    @TempDir
    static Path tempUploadDir;

    @DynamicPropertySource
    static void configureUploadDir(DynamicPropertyRegistry registry) {
        registry.add("app.storage.upload-dir", () -> tempUploadDir.toAbsolutePath().toString());
    }

    private User testUser;
    private static final String INITIAL_PASSWORD = "SenhaForteE2E@2026";

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);

        testUser = new User();
        testUser.setName("Aluno E2E Original");
        testUser.setEmail("aluno.e2e." + UUID.randomUUID() + "@uefs.br");
        testUser.setPassword(passwordEncoder.encode(INITIAL_PASSWORD));
        testUser.setTokenVersion(1);
        testUser = userRepository.save(testUser);
    }

    @AfterEach
    void tearDown() {
        roomRepository.deleteAll();
        transactionTemplate.executeWithoutResult(status ->
                entityManager.createQuery("DELETE FROM RoomMember").executeUpdate());
        userRepository.deleteAll();
    }

    private String getUrl(String path) {
        return "http://localhost:" + port + path;
    }

    private HttpHeaders createAuthHeaders(User user) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtService.generateToken(user.getId(), user.getTokenVersion()));
        return headers;
    }

    @Test
    @DisplayName("[E2E][US23] Jornada 1: Edição de perfil com foto via multipart real e acesso público aos bytes da foto em /fotosPerfil/**")
    void fullJourney_EditProfileWithPhoto_ServesPhotoViaGetAndUpdatesDatabase() {
        // 1. Prepara payload multipart real
        byte[] photoBytes = "conteudo-binario-foto-png-e2e".getBytes(StandardCharsets.UTF_8);
        ByteArrayResource photoResource = new ByteArrayResource(photoBytes) {
            @Override
            public String getFilename() {
                return "foto_e2e.png";
            }
        };

        HttpHeaders jsonHeaders = new HttpHeaders();
        jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> dataPart = new HttpEntity<>("{\"name\":\"Aluno E2E Atualizado\"}", jsonHeaders);

        HttpHeaders photoHeaders = new HttpHeaders();
        photoHeaders.setContentType(MediaType.IMAGE_PNG);
        HttpEntity<ByteArrayResource> photoPart = new HttpEntity<>(photoResource, photoHeaders);

        MultiValueMap<String, Object> multipartBody = new LinkedMultiValueMap<>();
        multipartBody.add("data", dataPart);
        multipartBody.add("photo", photoPart);

        HttpHeaders requestHeaders = createAuthHeaders(testUser);
        requestHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(multipartBody, requestHeaders);

        // 2. Dispara requisição PUT multipart real
        ResponseEntity<UserResponse> updateResponse = restTemplate.exchange(
                getUrl("/api/v1/users/me/profile"),
                HttpMethod.PUT,
                requestEntity,
                UserResponse.class
        );

        assertEquals(HttpStatus.OK, updateResponse.getStatusCode(), "Atualização de perfil deve retornar 200 OK");
        assertNotNull(updateResponse.getBody());
        assertEquals("Aluno E2E Atualizado", updateResponse.getBody().getName());
        String photoUrl = updateResponse.getBody().getProfilePictureUrl();
        assertNotNull(photoUrl, "A URL da foto deve ser preenchida");
        assertTrue(photoUrl.contains("/fotosPerfil/"));

        // 3. Executa GET público na rota da foto servida pelo backend
        ResponseEntity<byte[]> photoResponse = restTemplate.getForEntity(getUrl(photoUrl), byte[].class);
        assertEquals(HttpStatus.OK, photoResponse.getStatusCode(), "A foto armazenada deve ser acessível via GET público");
        assertArrayEquals(photoBytes, photoResponse.getBody(), "Os bytes servidos pela URL pública devem ser idênticos aos enviados");

        // 4. Confirma persistência real no banco de dados
        User reloaded = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals("Aluno E2E Atualizado", reloaded.getName());
        assertEquals(photoUrl, reloaded.getProfilePictureUrl());
    }

    @Test
    @DisplayName("[E2E][US23] Jornada 2: Troca de senha completa, bloqueio de credenciais antigas e login com nova senha")
    void fullJourney_ChangePasswordAndReAuthenticate_WorksEndToEnd() {
        // 1. Troca de senha via PUT /api/v1/users/me/password
        String newPassword = "NovaSenhaForte@2027";
        ChangePasswordRequest changeRequest = new ChangePasswordRequest(INITIAL_PASSWORD, newPassword);

        HttpHeaders headers = createAuthHeaders(testUser);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<ChangePasswordRequest> requestEntity = new HttpEntity<>(changeRequest, headers);

        ResponseEntity<String> changeResponse = restTemplate.exchange(
                getUrl("/api/v1/users/me/password"),
                HttpMethod.PUT,
                requestEntity,
                String.class
        );

        assertEquals(HttpStatus.OK, changeResponse.getStatusCode(), "A alteração de senha deve retornar 200 OK");
        assertTrue(changeResponse.getBody() != null && changeResponse.getBody().contains("Senha alterada com sucesso."));

        // 2. Tentativa de login com a senha antiga -> DEVE RETORNAR 401
        LoginRequest oldLogin = new LoginRequest(testUser.getEmail(), INITIAL_PASSWORD);
        ResponseEntity<String> oldLoginResponse = restTemplate.postForEntity(
                getUrl("/api/v1/auth/login"),
                oldLogin,
                String.class
        );
        assertEquals(HttpStatus.UNAUTHORIZED, oldLoginResponse.getStatusCode(),
                "Login com a senha antiga deve ser sumariamente recusado");

        // 3. Login com a nova senha -> DEVE RETORNAR 200 e novo token JWT
        LoginRequest newLogin = new LoginRequest(testUser.getEmail(), newPassword);
        ResponseEntity<LoginResponse> newLoginResponse = restTemplate.postForEntity(
                getUrl("/api/v1/auth/login"),
                newLogin,
                LoginResponse.class
        );
        assertEquals(HttpStatus.OK, newLoginResponse.getStatusCode(),
                "Login com a nova senha deve autenticar com sucesso");
        assertNotNull(newLoginResponse.getBody());
        assertNotNull(newLoginResponse.getBody().getToken());
    }
}
