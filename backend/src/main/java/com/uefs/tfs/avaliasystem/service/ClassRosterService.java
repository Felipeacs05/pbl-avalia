package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ClassRosterDTO;
import com.uefs.tfs.avaliasystem.dto.PageResponse;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClassRosterService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;

    @Transactional(readOnly = true)
    public PageResponse<ClassRosterDTO> getRoster(UUID roomId, UUID requesterId, Pageable pageable) {
        // Defesa em profundidade: mesmo sem o @PreAuthorize, só o tutor da sala acessa o carômetro
        if (!roomRepository.existsByIdAndTutorId(roomId, requesterId)) {
            throw new AccessDeniedException("Acesso negado: apenas o tutor da sala pode visualizar o carômetro");
        }

        Page<RoomMember> page = roomMemberRepository
                .findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(roomId, Role.STUDENT, pageable);

        return PageResponse.from(page.map(member -> ClassRosterDTO.from(member.getUser())));
    }
}