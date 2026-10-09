package com.uefs.tfs.avaliasystem.US14;

import com.uefs.tfs.avaliasystem.dto.AssessmentRequest;
import com.uefs.tfs.avaliasystem.model.Assessment;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.Team;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.AssessmentRepository;
import com.uefs.tfs.avaliasystem.repository.ProblemRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.PeerAssessmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PeerAssessmentServiceTest {
    @InjectMocks private PeerAssessmentService service;
    @Mock private ProblemRepository problemRepository;
    @Mock private AssessmentRepository assessmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoomMemberRepository roomMemberRepository;

    @Test
    @DisplayName("[US14] submeterPares_MesmoGrupo_Sucesso")
    void submeterPares_MesmoGrupo_Sucesso() {
        UUID evaluatorId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        
        Room room = new Room();
        room.setId(UUID.randomUUID());
        Problem p = new Problem();
        p.setRoom(room);
        p.setPeerAssessmentReleased(true);
        
        Team team = new Team();
        team.setId(UUID.randomUUID());
        
        RoomMember evalMember = new RoomMember();
        evalMember.setActive(true);
        evalMember.setTeam(team);
        
        RoomMember targetMember = new RoomMember();
        targetMember.setTeam(team);
        
        when(problemRepository.findById(any())).thenReturn(Optional.of(p));
        when(roomMemberRepository.findByRoomIdAndUserId(room.getId(), evaluatorId)).thenReturn(Optional.of(evalMember));
        when(roomMemberRepository.findByRoomIdAndUserId(room.getId(), targetId)).thenReturn(Optional.of(targetMember));
        when(userRepository.findById(evaluatorId)).thenReturn(Optional.of(new User()));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(new User()));
        
        service.submitPeerAssessments(UUID.randomUUID(), evaluatorId, List.of(new AssessmentRequest(targetId, 9.0, "Bom")));
        
        verify(assessmentRepository).save(any(Assessment.class));
    }

    @Test
    @DisplayName("[US14] submeterPares_GruposDiferentes_LancaExcecao")
    void submeterPares_GruposDiferentes_LancaExcecao() {
        UUID evaluatorId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        
        Room room = new Room();
        room.setId(UUID.randomUUID());
        Problem p = new Problem();
        p.setRoom(room);
        p.setPeerAssessmentReleased(true);
        
        Team team1 = new Team();
        team1.setId(UUID.randomUUID());
        Team team2 = new Team();
        team2.setId(UUID.randomUUID());
        
        RoomMember evalMember = new RoomMember();
        evalMember.setActive(true);
        evalMember.setTeam(team1);
        
        RoomMember targetMember = new RoomMember();
        targetMember.setTeam(team2);
        
        when(problemRepository.findById(any())).thenReturn(Optional.of(p));
        when(roomMemberRepository.findByRoomIdAndUserId(room.getId(), evaluatorId)).thenReturn(Optional.of(evalMember));
        when(roomMemberRepository.findByRoomIdAndUserId(room.getId(), targetId)).thenReturn(Optional.of(targetMember));
        when(userRepository.findById(evaluatorId)).thenReturn(Optional.of(new User()));
        
        assertThrows(AccessDeniedException.class, () -> 
            service.submitPeerAssessments(UUID.randomUUID(), evaluatorId, List.of(new AssessmentRequest(targetId, 9.0, "Bom")))
        );
        verify(assessmentRepository, never()).save(any());
    }
}
