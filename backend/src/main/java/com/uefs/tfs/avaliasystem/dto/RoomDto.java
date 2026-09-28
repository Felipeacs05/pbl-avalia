package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.model.Room;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RoomDto {
    private Long id;
    private String name;
    private String accessCode;
    private UUID tutorId;



    public static RoomDto from(Room room) {
        UUID tutorId = room.getTutor().getId();

        return new RoomDto(
                room.getId(),
                room.getName(),
                room.getAccessCode(),
                tutorId
        );
    }
}

