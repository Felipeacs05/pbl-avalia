package com.uefs.tfs.avaliasystem.model;

import com.uefs.tfs.avaliasystem.dto.RoomDto;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;

/*
id BIGSERIAL PRIMARY KEY,
nome VARCHAR(255) NOT NULL,
codigo_acesso VARCHAR(50) NOT NULL UNIQUE,
tutor_id UUID NOT NULL,
criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT fk_sala_tutor
    FOREIGN KEY (tutor_id)
    REFERENCES usuario(id)
    ON DELETE RESTRICT
*/

@Entity
@Table(name = "sala")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Column(name = "nome", nullable = false)
    private String name;

    @Column(name = "codigo_acesso", nullable = false, unique = true)
    private String accessCode;

    @ManyToOne
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime createdAt;

    public Room(String name, String accessCode, User tutor) {
        this.name = name;
        this.accessCode = accessCode;
        this.tutor = tutor;
        this.createdAt = OffsetDateTime.now();
    }


}