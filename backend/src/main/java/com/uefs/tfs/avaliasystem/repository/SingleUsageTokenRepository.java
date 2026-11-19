package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.SingleUsageToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SingleUsageTokenRepository
        extends JpaRepository<SingleUsageToken, Long> {

    Optional<SingleUsageToken> findByToken(String token);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT t FROM SingleUsageToken t
        WHERE t.token = :token
    """)
    Optional<SingleUsageToken> findByTokenForUpdate(
            @Param("token") String token
    );
}