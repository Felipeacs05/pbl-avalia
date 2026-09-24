package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String nome;
    private String email;
    private String senha;
    private String fotoPerfilUrl;

    public Usuario(String nome, String email, String senha, String fotoPerfilUrl) {
        this.nome = nome;
        this.email = email;
        this.senha = senha;
        this.fotoPerfilUrl = fotoPerfilUrl;
    }
}
