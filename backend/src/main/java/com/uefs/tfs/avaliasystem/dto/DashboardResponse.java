package com.uefs.tfs.avaliasystem.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
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

    private List<RoomDto> roomsAsTutor = List.of();

    private List<RoomDto> roomsAsStudent = List.of();

}