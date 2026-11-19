package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.model.SingleUsageToken;
import com.uefs.tfs.avaliasystem.repository.SingleUsageTokenRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
public class SingleUsageTokenService {

    private final SingleUsageTokenRepository repository;

    @PersistenceContext
    private EntityManager entityManager;

    public SingleUsageTokenService(
            SingleUsageTokenRepository repository
    ) {
        this.repository = repository;
    }

    @Transactional
    public SingleUsageToken generateToken(Duration expiration) {
        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(expiration);

        SingleUsageToken singleUsageToken =
                new SingleUsageToken(token, expiresAt);

        return repository.save(singleUsageToken);
    }

    @Transactional(readOnly = true)
    public SingleUsageToken findValidToken(String token) {
        return repository.findByToken(token)
                .filter(SingleUsageToken::isValid)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Token inválido ou expirado."
                        )
                );
    }

    @Transactional
    public SingleUsageToken findValidTokenForUpdate(String token) {
        SingleUsageToken singleUsageToken = repository.findByTokenForUpdate(token)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Token inválido ou expirado."
                        )
                );

        entityManager.refresh(singleUsageToken);

        if (!singleUsageToken.isValid()) {
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }

        return singleUsageToken;
    }



    @Transactional
    public void consume(SingleUsageToken token) {
        token.setUsed(true);
        repository.save(token);
    }

    @Transactional
    public void invalidate(SingleUsageToken token) {
        token.setUsed(true);
        repository.save(token);
    }
}