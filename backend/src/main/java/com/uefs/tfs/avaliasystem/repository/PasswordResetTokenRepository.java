    package com.uefs.tfs.avaliasystem.repository;

    import com.uefs.tfs.avaliasystem.model.PasswordResetToken;
    import jakarta.persistence.LockModeType;
    import org.springframework.data.jpa.repository.JpaRepository;
    import org.springframework.data.jpa.repository.Lock;
    import org.springframework.data.jpa.repository.Query;
    import org.springframework.data.repository.query.Param;
    import org.springframework.stereotype.Repository;

    import java.util.Optional;
    import java.util.UUID;

    @Repository
    public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

        Optional<PasswordResetToken> findByToken(String token);

        Optional<PasswordResetToken> findFirstByUser_IdOrderByIdDesc(UUID userId); //pega a ultima token pertencente a um usuário
        //pra que se vc gerar 2 tokens so a ultima seja válida

        @Lock(LockModeType.PESSIMISTIC_WRITE) //evita problema de uma requisição tentar consumir uma token
        // que ESTÁ sendo marcada como consumida por outra requisição
        @Query("SELECT t FROM PasswordResetToken t WHERE t.token = :token")
        Optional<PasswordResetToken> findByTokenForUpdate(@Param("token") String token);
    }
