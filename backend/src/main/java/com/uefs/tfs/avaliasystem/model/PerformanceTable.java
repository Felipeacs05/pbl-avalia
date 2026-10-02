package com.uefs.tfs.avaliasystem.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "performance_tables")
public class PerformanceTable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @OneToMany(mappedBy = "performanceTable", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Criterion> criteriaList = new ArrayList<>();
}
