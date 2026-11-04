package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.BehaviorRecordRequest;
import com.uefs.tfs.avaliasystem.dto.BehaviorRecordResponse;
import com.uefs.tfs.avaliasystem.dto.BehaviorTagResponse;
import com.uefs.tfs.avaliasystem.exception.ResourceNotFoundException;
import com.uefs.tfs.avaliasystem.model.BehaviorRecord;
import com.uefs.tfs.avaliasystem.model.BehaviorTag;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.BehaviorRecordRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorTagRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BehaviorRecordService {

    private final BehaviorRecordRepository behaviorRecordRepository;
    private final BehaviorTagRepository behaviorTagRepository;
    private final TutoringSessionRepository tutoringSessionRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<BehaviorTagResponse> listBehaviorTags(UUID roomId) {
        return behaviorTagRepository.findAllByRoomIdOrderByNameAsc(roomId).stream()
                .map(tag -> new BehaviorTagResponse(tag.getId(), tag.getName()))
                .toList();
    }

    @Transactional
    @PreAuthorize("@tutoringSessionSecurity.requireTutor(#sessionId, #requesterId)")
    public BehaviorRecordResponse createBehaviorRecord(
            UUID sessionId,
            UUID studentId,
            BehaviorRecordRequest request,
            UUID requesterId
    ) {
        TutoringSession session = tutoringSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Sessão não encontrada."));

        Room room = session.getProblem().getRoom();
        validateContent(request);

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Aluno não encontrado."));

        if (!roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), studentId)) {
            throw new IllegalArgumentException("O aluno não possui vínculo ativo com a sala da sessão.");
        }

        BehaviorTag tag = findAndValidateTag(request.getTagId(), room);

        BehaviorRecord record = new BehaviorRecord();
        record.setSession(session);
        record.setStudent(student);
        record.setTag(tag);
        record.setText(request.getText());
        record.setRecordedAt(clock.instant());

        return toResponse(behaviorRecordRepository.save(record));
    }

    private void validateContent(BehaviorRecordRequest request) {
        if (request.getTagId() == null && (request.getText() == null || request.getText().isBlank())) {
            throw new IllegalArgumentException("Informe uma tag ou um texto.");
        }
    }

    private BehaviorTag findAndValidateTag(UUID tagId, Room room) {
        if (tagId == null) {
            return null;
        }

        BehaviorTag tag = behaviorTagRepository.findById(tagId)
                .orElseThrow(() -> new ResourceNotFoundException("Tag de comportamento não encontrada."));

        if (!tag.getRoom().getId().equals(room.getId())) {
            throw new IllegalArgumentException("A tag informada não pertence à sala da sessão.");
        }

        return tag;
    }

    private BehaviorRecordResponse toResponse(BehaviorRecord record) {
        return BehaviorRecordResponse.from(record);
    }
}
