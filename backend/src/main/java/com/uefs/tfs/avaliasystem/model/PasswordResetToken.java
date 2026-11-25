// backend/src/main/java/com/uefs/tfs/avaliasystem/model/PasswordResetToken.java
package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
public class PasswordResetToken implements SingleUsageTokenInterface{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "single_usage_token_id", nullable = false, unique = true)
    private SingleUsageToken token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false, name = "user_id")
    private User user;

    public PasswordResetToken(User user, SingleUsageToken token) {
        this.user = user;
        this.token = token;
    }



    public PasswordResetToken() {

    }

    @Override
    public String toString() {
        return token.toString();
    }
}