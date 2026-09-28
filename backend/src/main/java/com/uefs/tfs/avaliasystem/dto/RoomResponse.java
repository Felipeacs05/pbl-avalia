package com.uefs.tfs.avaliasystem.dto;

public class RoomResponse {
    private String id;
    private String name;
    private String code;
    private String joinLink;

    public RoomResponse() {}


    public RoomResponse(String code, String joinLink) {
        this.code = code;
        this.joinLink = joinLink;
    }


    public RoomResponse(String id, String name, String code, String joinLink) {
        this.id = id;
        this.name = name;
        this.code = code;
        this.joinLink = joinLink;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getJoinLink() { return joinLink; }
    public void setJoinLink(String joinLink) { this.joinLink = joinLink; }
}