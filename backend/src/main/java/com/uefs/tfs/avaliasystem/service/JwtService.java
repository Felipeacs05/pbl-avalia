package com.uefs.tfs.avaliasystem.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class JwtService {

    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;
    private final Duration expiration;

    public JwtService(
            JwtEncoder jwtEncoder,
            JwtDecoder jwtDecoder,
            @Value("${security.jwt.expiration-time}") long expirationTime
    ) {
        this.jwtEncoder = jwtEncoder;
        this.jwtDecoder = jwtDecoder;
        this.expiration = Duration.ofMillis(expirationTime);
    }

    public String generateToken(UUID id) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(expiration);

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(id.toString())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .build();

        JwsHeader header = JwsHeader
                .with(MacAlgorithm.HS256)
                .type("JWT")
                .build();

        Jwt jwt = jwtEncoder.encode(
                JwtEncoderParameters.from(header, claims)
        );

        return jwt.getTokenValue();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(jwtDecoder.decode(token).getSubject());
    }

    public boolean isTokenValid(String token, UUID expectedId) {
        try {
            Jwt jwt = jwtDecoder.decode(token);

            return expectedId.toString().equals(jwt.getSubject())
                    && jwt.getExpiresAt() != null
                    && jwt.getExpiresAt().isAfter(Instant.now());
        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    public long getExpirationTime() {
        return expiration.toMillis();
    }
}
