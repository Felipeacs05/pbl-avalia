package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.DashboardResponse;
import com.uefs.tfs.avaliasystem.dto.RoomDto;
import com.uefs.tfs.avaliasystem.exception.UserNotFoundException;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;


@Service
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    @Autowired
    public RoomServiceImpl(RoomRepository roomRepository, UserRepository userRepository) {
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
    }
    public DashboardResponse getDashboardByUser(UUID userId){

        if (!userRepository.existsById(userId)) {
            throw new UserNotFoundException("User not found: " + userId);
        }

        //tem essa coisa toda dps do find by tutor id pra converter em roomDto
        //eu ACHO q nao precisamos ter dados como created at no menu do usuário
        //se precisar, a gnt pd so alterar isso dps
        List<RoomDto> roomAsTutor = roomRepository.findByTutorId(userId).stream().map(RoomDto::from).toList();
        List<RoomDto> roomsAsStudent = roomRepository.findRoomsByParticipantId(userId).stream().map(RoomDto::from).toList();

        return new DashboardResponse(roomAsTutor,roomsAsStudent);
    }
}
