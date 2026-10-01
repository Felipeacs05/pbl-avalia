package com.uefs.tfs.avaliasystem.model;

import com.uefs.tfs.avaliasystem.dto.RoomDto;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

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
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String accessCode;

    private String inviteLink;

    @ManyToOne(optional = false)
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;


}

