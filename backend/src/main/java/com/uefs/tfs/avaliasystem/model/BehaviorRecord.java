package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "behavior_record",
        check = @CheckConstraint(
                name = "ck_has_tag_or_text",
                constraint = "tag_id IS NOT NULL OR (text IS NOT NULL AND TRIM(text) <> '')"
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BehaviorRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private TutoringSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id")
    private BehaviorTag tag;

    @Column(name = "text", length = 500)
    private String text;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;
}
