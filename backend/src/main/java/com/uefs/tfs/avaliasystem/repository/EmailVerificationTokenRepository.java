package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.EmailVerificationToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    @Query("SELECT t FROM EmailVerificationToken t WHERE t.token.token = :token")
    Optional<EmailVerificationToken> findByToken(@Param("token") String token);

    Optional<EmailVerificationToken> findFirstByUser_IdOrderByIdDesc(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM EmailVerificationToken t WHERE t.token.token = :token")
    Optional<EmailVerificationToken> findByTokenForUpdate(@Param("token") String token);
}
