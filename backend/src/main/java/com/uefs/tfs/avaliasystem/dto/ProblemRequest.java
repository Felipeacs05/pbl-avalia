package com.uefs.tfs.avaliasystem.dto;

import jakarta.validation.constraints.NotBlank;

public class ProblemRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    public ProblemRequest() {}

    public ProblemRequest(String title) {
        this.title = title;
    }

    public ProblemRequest(String title, String description) {
        this.title = title;
        this.description = description;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}