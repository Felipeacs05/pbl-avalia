package com.uefs.tfs.avaliasystem.dto;

import java.util.UUID;

public class RoomResponse {
    private UUID id;
    private String name;
    private String description;
    private String code;
    private String joinLink;
    private String tutorName;

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

    public RoomResponse(UUID id, String name, String code, String joinLink, String tutorName) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.joinLink = joinLink;
        this.tutorName = tutorName;
    }

    public RoomResponse(UUID id, String name, String description, String code, String joinLink, String tutorName) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.code = code;
        this.joinLink = joinLink;
        this.tutorName = tutorName;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getJoinLink() { return joinLink; }
    public void setJoinLink(String joinLink) { this.joinLink = joinLink; }
    public String getTutorName() { return tutorName; }
    public void setTutorName(String tutorName) { this.tutorName = tutorName; }
}
