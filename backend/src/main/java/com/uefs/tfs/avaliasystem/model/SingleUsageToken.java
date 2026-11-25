package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.GenerationType;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
@Entity
@Getter
@Setter
public class SingleUsageToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private Instant expiryDate;

    @CreationTimestamp
    @Column(nullable = false)
    private Instant createdAt; //uso isso aq pra saber qndo permitir o reenvio do email


    @Column(nullable = false)
    private boolean used;

    public SingleUsageToken() {}

    public SingleUsageToken(String token, Instant expiryDate) {
        this.token = token;
        this.expiryDate = expiryDate;
        this.used = false;
    }

    public boolean isValid() {
        return !used
                && expiryDate != null
                && expiryDate.isAfter(Instant.now());
    }


    @Override
    public String toString() {
        return this.token;
    }
}