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
    private UUID id;
    private String name;
    private String description;
    private String accessCode;
    private UUID tutorId;
    private String tutorName;

    public RoomDto(UUID id, String name, String accessCode, UUID tutorId) {
        this.id = id;
        this.name = name;
        this.accessCode = accessCode;
        this.tutorId = tutorId;
    }

    public RoomDto(UUID id, String name, String accessCode, UUID tutorId, String tutorName) {
        this.id = id;
        this.name = name;
        this.accessCode = accessCode;
        this.tutorId = tutorId;
        this.tutorName = tutorName;
    }

    public static RoomDto from(Room room) {
        UUID tutorId = room.getTutor() != null ? room.getTutor().getId() : null;
        String tutorName = room.getTutor() != null ? room.getTutor().getName() : null;

        RoomDto dto = new RoomDto(
                room.getId(),
                room.getName(),
                room.getAccessCode(),
                tutorId,
                tutorName
        );
        dto.setDescription(room.getDescription());
        return dto;
    }
}
