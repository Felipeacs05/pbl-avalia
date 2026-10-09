package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Setter
@Getter
@Entity
@Table(
        name = "group_member",
        //importante pra n ter como uma pessoa entrar no mesmo grupo mais de uma vez
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"group_id", "user_id"}
        )
)
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(
            name = "group_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_group_member_group")
    )
    private Group group;

    @ManyToOne(optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_group_member_user")
    )
    private User user;
}
