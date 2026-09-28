package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String accessCode;

    private String inviteLink;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;

}