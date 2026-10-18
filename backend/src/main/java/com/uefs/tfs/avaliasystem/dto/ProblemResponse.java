package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Problem;
import java.util.UUID;

public class ProblemResponse {
    private UUID id;
    private String title;

    public ProblemResponse() {}

    public ProblemResponse(UUID id, String title) {
        this.id = id;
        this.title = title;
    }

    public ProblemResponse(Problem problem) {
        this.id = problem.getId();
        this.title = problem.getTitle();
    }

    public Object getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }
}