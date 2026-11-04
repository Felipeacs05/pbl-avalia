package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Problem;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class ProblemResponse {
    private UUID id;
    private String title;
    private String description;
    private String disciplineCode;
    private String semester = "2026.2";
    private List<Map<String, Object>> sessions = new ArrayList<>();

    public ProblemResponse() {}

    public ProblemResponse(UUID id, String title) {
        this.id = id;
        this.title = title;
    }

    public ProblemResponse(UUID id, String title, String description) {
        this.id = id;
        this.title = title;
        this.description = description;
    }

    public ProblemResponse(Problem problem) {
        this.id = problem.getId();
        this.title = problem.getTitle();
        this.description = problem.getDescription();
        if (problem.getRoom() != null) {
            this.disciplineCode = problem.getRoom().getAccessCode();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public String getDisciplineCode() {
        return disciplineCode;
    }

    public void setDisciplineCode(String disciplineCode) {
        this.disciplineCode = disciplineCode;
    }

    public String getSemester() {
        return semester;
    }

    public void setSemester(String semester) {
        this.semester = semester;
    }

    public List<Map<String, Object>> getSessions() {
        return sessions;
    }

    public void setSessions(List<Map<String, Object>> sessions) {
        this.sessions = sessions;
    }
}
