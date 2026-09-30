package com.uefs.tfs.avaliasystem.Security;

import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;
@Component("roomSecurity")
@RequiredArgsConstructor
public class RoomSecurity {

    private final RoomRepository roomRepository;

    public boolean isOwner(UUID roomId, Authentication authentication) {
        //pega o subject to jwt(o qual contem o id do usuario)
        UUID userId = UUID.fromString(authentication.getName());
        //retorna se a sala existe, e se o id do usuário e o mesmo id q ta em tutor_id, na sala.
        return roomRepository.existsByIdAndTutorId(roomId.toString(), userId);
    }

    public boolean isOwner(String roomId, Authentication authentication) {

        //pega o subject to jwt(o qual contem o id do usuario)
        UUID userId = UUID.fromString(authentication.getName());
        //retorna se a sala existe, e se o id do usuário e o mesmo id q ta em tutor_id, na sala.

        return roomRepository.existsByIdAndTutorId(roomId, userId);
    }
}
