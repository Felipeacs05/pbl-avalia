package com.uefs.tfs.avaliasystem.dto;

import java.util.UUID;

public class RoomResponse {
    private UUID id;
    private String name;
    private String code;
    private String joinLink;
    private String tutor;
    private UUID tutorId;

    public RoomResponse() {
    }

    public RoomResponse(String code, String joinLink) {
        this.code = code;
        this.joinLink = joinLink;
    }

    public RoomResponse(UUID id, String name, String code, String joinLink) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.joinLink = joinLink;
    }

    public RoomResponse(UUID id, String name, String code, String joinLink, String tutor) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.joinLink = joinLink;
        this.tutor = tutor;
    }

    public RoomResponse(UUID id, String name, String code, String joinLink, String tutor, UUID tutorId) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.joinLink = joinLink;
        this.tutor = tutor;
        this.tutorId = tutorId;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getJoinLink() { return joinLink; }
    public void setJoinLink(String joinLink) { this.joinLink = joinLink; }
    public String getTutor() { return tutor; }
    public void setTutor(String tutor) { this.tutor = tutor; }
    public UUID getTutorId() { return tutorId; }
    public void setTutorId(UUID tutorId) { this.tutorId = tutorId; }
}
