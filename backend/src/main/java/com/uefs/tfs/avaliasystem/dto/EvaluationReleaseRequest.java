package com.uefs.tfs.avaliasystem.dto;

public class EvaluationReleaseRequest {
    private String type;
    private Boolean keepOthers;

    public EvaluationReleaseRequest() {}

    public EvaluationReleaseRequest(String type, Boolean keepOthers) {
        this.type = type;
        this.keepOthers = keepOthers;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Boolean getKeepOthers() {
        return keepOthers;
    }

    public void setKeepOthers(Boolean keepOthers) {
        this.keepOthers = keepOthers;
    }
}

