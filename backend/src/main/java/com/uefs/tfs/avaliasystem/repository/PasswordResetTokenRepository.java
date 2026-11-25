package com.uefs.tfs.avaliasystem.repository;

import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    @Query("SELECT t FROM PasswordResetToken t WHERE t.token.token = :token")
    Optional<PasswordResetToken> findByToken(@Param("token") String token);

    Optional<PasswordResetToken> findFirstByUser_IdOrderByIdDesc(UUID userId);
}