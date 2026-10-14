package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(
        name = "performance_tables",
        check = @CheckConstraint(
                name = "chk_performance_table_owner",
                //agr a performance table pertence a uma sala ou um problema(um ou o outro nunca os 2)
                constraint = "(room_id IS NOT NULL AND problem_id IS NULL) OR (room_id IS NULL AND problem_id IS NOT NULL)"
        )
)
public class PerformanceTable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;


    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id")
    private Problem problem;

    @OneToMany(mappedBy = "performanceTable", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Criterion> criteriaList = new ArrayList<>();
}
