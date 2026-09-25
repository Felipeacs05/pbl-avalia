package com.uefs.tfs.avaliasystem.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Dashboard response DTO (US02).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    @JsonAlias("roomsAsTutor")
    private List<RoomDto> salasComoTutor;

    @JsonAlias("roomsAsStudent")
    private List<RoomDto> salasComoAluno;

    public List<RoomDto> getRoomsAsTutor() {
        return salasComoTutor;
    }

    public void setRoomsAsTutor(List<RoomDto> roomsAsTutor) {
        this.salasComoTutor = roomsAsTutor;
    }

    public List<RoomDto> getRoomsAsStudent() {
        return salasComoAluno;
    }

    public void setRoomsAsStudent(List<RoomDto> roomsAsStudent) {
        this.salasComoAluno = roomsAsStudent;
    }
}