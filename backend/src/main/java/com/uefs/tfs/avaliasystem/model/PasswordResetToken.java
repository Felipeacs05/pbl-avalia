// backend/src/main/java/com/uefs/tfs/avaliasystem/model/PasswordResetToken.java
package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
public class PasswordResetToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(nullable = false, name = "user_id")
    private User user;

    @Column(nullable = false)
    private Instant expiryDate;

    @Column(nullable = false)
    private boolean used;

    public PasswordResetToken() {}

    public PasswordResetToken(User user, String token, Instant expiryDate) {
        this.user = user;
        this.token = token;
        this.expiryDate = expiryDate;
        this.used = false;
    }

    public boolean isValid() {
        return !used && expiryDate != null && expiryDate.isAfter(Instant.now());
    }
}
