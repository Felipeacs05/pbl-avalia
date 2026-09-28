package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RoomService {

    private RoomRepository roomRepository;

    private UserRepository userRepository;

    public RoomService(RoomRepository roomRepository, UserRepository userRepository){
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public RoomResponse createRoom(RoomRequest request, String tutorId) {
        User tutor = userRepository.findById(UUID.fromString(tutorId))
                .orElseThrow(() -> new IllegalArgumentException("Utilizador não encontrado para assumir o papel de Tutor."));

        Room room = new Room();
        room.setName(request.getName());
        room.setTutor(tutor);

        // Gera código de acesso único
        String accessCode;
        do {
            accessCode = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        } while (roomRepository.existsByAccessCode(accessCode));

        room.setAccessCode(accessCode);
        room.setInviteLink("app/join/" + accessCode);

        room = roomRepository.save(room);

        return new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink());
    }

    @Transactional
    public RoomResponse updateRoom(String roomId, RoomRequest request, String tutorId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada"));

        if (!room.getTutor().getId().toString().equals(tutorId)) {
            throw new SecurityException("Apenas o Tutor da sala possui permissão para editá-la.");
        }

        room.setName(request.getName());
        room = roomRepository.save(room);

        return new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink());
    }

    @Transactional
    public void deleteRoom(String roomId, String tutorId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Sala não encontrada"));

        if (!room.getTutor().getId().toString().equals(tutorId)) {
            throw new SecurityException("Apenas o Tutor da sala possui permissão para excluí-la.");
        }

        roomRepository.delete(room);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(String userId) {
        return roomRepository.findAllByTutorOrActiveMember(UUID.fromString(userId)).stream()
                .map(room -> new RoomResponse(room.getId(), room.getName(), room.getAccessCode(), room.getInviteLink()))
                .collect(Collectors.toList());
    }
}