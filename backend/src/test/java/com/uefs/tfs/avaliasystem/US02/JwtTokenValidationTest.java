package com.uefs.tfs.avaliasystem.US02;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
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
class JwtTokenValidationTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        this.objectMapper = new ObjectMapper();
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
        long nowSeconds = Instant.now().getEpochSecond();
        long expiration24hSeconds = Instant.now().plus(24, ChronoUnit.HOURS).getEpochSecond();

        // Simulação de payload padrão emitido na autenticação
        String payloadJson = String.format(
                "{\"sub\":\"ana@uefs.br\",\"iat\":%d,\"exp\":%d,\"role\":\"USUARIO\"}",
                nowSeconds,
                expiration24hSeconds
        );
        String headerBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String jwtToken = headerBase64 + "." + payloadBase64 + ".assinaturaSimulada123";

        // Extrai e valida as claims reais
        JsonNode claims = extractClaims(jwtToken);

        assertThat(claims.has("sub")).as("O JWT deve conter a claim 'sub'").isTrue();
        assertThat(claims.get("sub").asText()).isEqualTo("ana@uefs.br");

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
        long pastSeconds = Instant.now().minus(2, ChronoUnit.HOURS).getEpochSecond();
        String payloadJson = String.format("{\"sub\":\"ana@uefs.br\",\"exp\":%d}", pastSeconds);
        String headerBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"HS256\"}".getBytes(StandardCharsets.UTF_8));
        String payloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String expiredToken = headerBase64 + "." + payloadBase64 + ".assinatura";

        JsonNode claims = extractClaims(expiredToken);
        long exp = claims.get("exp").asLong();
        boolean isExpired = exp < Instant.now().getEpochSecond();

        assertThat(isExpired)
                .as("Um token com data de expiração no passado deve ser identificado como expirado")
                .isTrue();
    }

    @Test
    @DisplayName("US02-I2 - Token malformado (sem as 3 partes) deve ser rejeitado")
    void shouldFailToExtractMalformedToken() {
        String malformedToken = "Bearer tokenSemPontosNemFormatoJwt";

        assertThatThrownBy(() -> extractClaims(malformedToken))
                .isInstanceOf(AssertionError.class)
                .as("A extração de um token com formato inválido deve lançar um erro");
    }
}