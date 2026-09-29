package com.uefs.tfs.avaliasystem.US02;

import com.uefs.tfs.avaliasystem.dto.LoginResponse;
import com.uefs.tfs.avaliasystem.dto.RegisterUserRequest;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.service.JwtService;
import com.uefs.tfs.avaliasystem.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Validação do Critério de Aceite 1: Geração e validade estrita do Token JWT (24 horas).
 * Inspeciona profundamente a estrutura padrão do JWT (RFC 7519):
 * - Header (algoritmo e tipo)
 * - Payload/Claims (subject e expiração de 24h)
 * - Validação de expiração temporal (garante que não há token infinito)
 */
@DisplayName("US02 - Validação Estrutural e Temporal de Token JWT")
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class JwtTokenValidationTest {

    private ObjectMapper objectMapper;

    @Autowired
    private UserService userService;
    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private JwtService jwtService;
    private User registeredUser;
    private LoginResponse loginResponse;

    private String generateExpiredToken(UUID userId) {
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(userId.toString())
                .issuedAt(now.minusSeconds(7200))
                .expiresAt(now.minusSeconds(3600))
                .build();

        JwsHeader header = JwsHeader
                .with(MacAlgorithm.HS256)
                .type("JWT")
                .build();

        return jwtEncoder.encode(
                JwtEncoderParameters.from(header, claims)
        ).getTokenValue();
    }

    @BeforeEach
    void setUp() {
        this.objectMapper = new ObjectMapper();

        String email = "ana@uefs.br";
        String password = "senhaForte123";

        var registration = new RegisterUserRequest("Ana Silva", email, password);

        //
        var photo = new MockMultipartFile(
                "photo",
                "perfil.jpg",
                "image/jpeg",
                "conteudo-fake".getBytes(StandardCharsets.UTF_8)
        );

        this.registeredUser = userService.register(registration, photo);
        this.loginResponse = userService.login(email, password);
    }

    /**
     * Utilitário para decodificar o payload Base64URL de um token JWT padrão
     */
    private JsonNode extractClaims(String jwtToken) throws Exception {
        String[] parts = jwtToken.split("\\.");

        assertThat(parts)
                .as("Um token JWT válido deve possuir exatamente 3 partes separadas por ponto (header.payload.signature)")
                .hasSize(3);

        byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
        return objectMapper.readTree(new String(payloadBytes, StandardCharsets.UTF_8));
    }

    @Test
    @DisplayName("US02-V1 - Token JWT deve conter claim 'exp' configurada para exatamente 24h à frente de 'iat'")
    void shouldContain24HourExpirationInPayload() throws Exception {
        String jwtToken = loginResponse.getToken();

        JsonNode claims = extractClaims(jwtToken);

        assertThat(claims.has("sub")).as("O JWT deve conter a claim 'sub'").isTrue();
        assertThat(claims.get("sub").asString()).isEqualTo(registeredUser.getId().toString());

        assertThat(claims.has("exp")).as("O JWT deve conter a claim 'exp' (expiração)").isTrue();
        assertThat(claims.has("iat")).as("O JWT deve conter a claim 'iat' (momento de emissão)").isTrue();

        long exp = claims.get("exp").asLong();
        long iat = claims.get("iat").asLong();
        long differenceSeconds = exp - iat;
        long twentyFourHoursSeconds = 24 * 60 * 60L; // 86.400 segundos

        assertThat(differenceSeconds)
                .as("A validade do token JWT deve ser rigorosamente de 24 horas (86.400 segundos)")
                .isEqualTo(twentyFourHoursSeconds);

        assertThat(exp)
                .as("O momento de expiração deve ser no futuro em relação ao momento atual")
                .isGreaterThan(Instant.now().getEpochSecond());
    }

    @Test
    @DisplayName("US02-I1 - Token expirado deve ter 'exp' no passado e ser considerado inválido")
    void shouldDetectTokenWithPastExpirationAsExpired() throws Exception {

        UUID uuid = jwtService.extractUserId(loginResponse.getToken());
        String expiredToken = generateExpiredToken(uuid);
        boolean isExpired = !(jwtService.isTokenValid(expiredToken, uuid)); //se o token tiver expirado, o validador retorna false, e !false = true

        assertThat(isExpired)
                .as("Um token com data de expiração no passado deve ser identificado como expirado")
                .isTrue();
    }

    @Test
    @DisplayName("US02-I2 - Token malformado (sem as 3 partes) deve ser rejeitado")
    void shouldRejectMalformedToken() {
        String validToken = loginResponse.getToken();

        // remove a assinatura do token, convertendo ele na substring de a aprtir da letra na posição 0 até a letra na posição do
        //ultimo ponto
        String malformedToken = validToken.substring(
                0,
                validToken.lastIndexOf('.')
        );

        assertThatThrownBy(() -> extractClaims(malformedToken))
                .as("Um token sem as 3 partes deve ser rejeitado durante a extração das claims")
                .isInstanceOf(AssertionError.class);

        assertThat(jwtService.isTokenValid(malformedToken, registeredUser.getId()))
                .as("Um token com formato inválido deve ser rejeitado pelo JwtService")
                .isFalse();
    }
}
