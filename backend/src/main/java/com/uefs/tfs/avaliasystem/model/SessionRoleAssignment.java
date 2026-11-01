package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(
    name = "session_role_assignment",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_session_role", columnNames = {"session_id", "role"}),
        @UniqueConstraint(name = "uk_session_student", columnNames = {"session_id", "student_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SessionRoleAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private TutoringSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private SessionRole role;

    @Column(name = "extra_grade", nullable = false)
    private Double extraGrade;
}
