package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Problem;
import java.util.UUID;

public class ProblemResponse {
    private UUID id;
    private String title;
    private String description;
    private UUID roomId;
    private Boolean selfAssessmentReleased;
    private Boolean peerAssessmentReleased;

    public ProblemResponse() {}

    public ProblemResponse(UUID id, String title) {
        this.id = id;
        this.title = title;
    }

    public ProblemResponse(Problem problem) {
        this.id = problem.getId();
        this.title = problem.getTitle();
        this.description = problem.getDescription();
        this.roomId = problem.getRoom() != null ? problem.getRoom().getId() : null;
        this.selfAssessmentReleased = problem.getSelfAssessmentReleased();
        this.peerAssessmentReleased = problem.getPeerAssessmentReleased();
    }

    public Object getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public UUID getRoomId() {
        return roomId;
    }

    public Boolean getSelfAssessmentReleased() {
        return selfAssessmentReleased;
    }

    public Boolean getPeerAssessmentReleased() {
        return peerAssessmentReleased;
    }
}
