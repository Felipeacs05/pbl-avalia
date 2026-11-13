package com.uefs.tfs.avaliasystem.US24;

import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Contrato assumido:
 * - RoomMemberRepository:
 *   - findByRoomIdAndUserId: devolve a linha mesmo quando active=false (sem filtro de active).
 *   - existsByRoomIdAndUserIdAndActiveTrue: retorna false após inativação.
 *   - findRoomsByParticipantId: filtra active=true; aluno inativo some.
 *   - findAvailableStudentsByRoomId: filtra active=true; aluno inativo some.
 *   - findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc: filtra active=true; aluno inativo some.
 * - Verificações de persistência física após flush/clear (prova que o H2 escreveu).
 */
@DataJpaTest
@DisplayName("[US24] Testes de Repositório — RoomMemberRepository após soft delete")
class RoomRemoveStudentRepositoryTest {

    @Autowired
    private RoomMemberRepository roomMemberRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User tutor;
    private User student;
    private Room room;
    private RoomMember member;

    @BeforeEach
    void setUp() {
        // Persiste tutor
        tutor = new User();
        tutor.setName("Tutor Repo");
        tutor.setEmail("tutor.repo." + UUID.randomUUID().toString().substring(0, 8) + "@uefs.br");
        tutor.setPassword("hash");
        tutor = entityManager.persistFlushFind(tutor);

        // Persiste aluno
        student = new User();
        student.setName("Aluno Repo");
        student.setEmail("aluno.repo." + UUID.randomUUID().toString().substring(0, 8) + "@uefs.br");
        student.setPassword("hash");
        student = entityManager.persistFlushFind(student);

        // Persiste sala
        room = new Room();
        room.setName("Sala Repo US24");
        room.setAccessCode("US24" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
        room.setTutor(tutor);
        room = entityManager.persistFlushFind(room);

        // Persiste RoomMember ativo
        member = new RoomMember();
        member.setRoom(room);
        member.setUser(student);
        member.setRole(Role.STUDENT);
        member.setActive(true);
        member.setUnlinkedAt(null);
        member = entityManager.persistFlushFind(member);
    }

    @Test
    @DisplayName("[US24] findByRoomIdAndUserId deve retornar a linha mesmo após inativação (active=false)")
    void findByRoomIdAndUserId_AfterSoftDelete_StillReturnsInactiveRow() {
        // Arrange — simula soft delete
        member.setActive(false);
        member.setUnlinkedAt(Instant.now());
        roomMemberRepository.save(member);
        entityManager.flush();
        entityManager.clear();

        // Act
        Optional<RoomMember> found = roomMemberRepository.findByRoomIdAndUserId(room.getId(), student.getId());

        // Assert — a linha deve existir (soft delete, não hard delete)
        assertTrue(found.isPresent(), "A linha do RoomMember deve continuar existindo após o soft delete");
        assertFalse(found.get().isActive(), "O vínculo deve estar marcado como inativo");
        assertNotNull(found.get().getUnlinkedAt(), "unlinkedAt deve estar preenchido");
    }

    @Test
    @DisplayName("[US24] existsByRoomIdAndUserIdAndActiveTrue deve retornar false após inativação")
    void existsByRoomIdAndUserIdAndActiveTrue_AfterSoftDelete_ReturnsFalse() {
        // Arrange
        member.setActive(false);
        member.setUnlinkedAt(Instant.now());
        roomMemberRepository.save(member);
        entityManager.flush();
        entityManager.clear();

        // Act
        boolean exists = roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), student.getId());

        // Assert — aluno não deve ser visto como membro ativo
        assertFalse(exists, "Aluno inativo não deve aparecer na verificação de vínculo ativo");
    }

    @Test
    @DisplayName("[US24] findRoomsByParticipantId deve omitir a sala do aluno após inativação")
    void findRoomsByParticipantId_AfterSoftDelete_RoomDisappearsFromList() {
        // Arrange — antes da inativação, a sala aparece
        List<Room> before = roomRepository.findRoomsByParticipantId(student.getId());
        assertTrue(before.stream().anyMatch(r -> r.getId().equals(room.getId())),
                "A sala deve aparecer para o aluno ANTES da remoção");

        // Act — soft delete
        member.setActive(false);
        member.setUnlinkedAt(Instant.now());
        roomMemberRepository.save(member);
        entityManager.flush();
        entityManager.clear();

        // Assert — sala some da listagem do aluno
        List<Room> after = roomRepository.findRoomsByParticipantId(student.getId());
        assertFalse(after.stream().anyMatch(r -> r.getId().equals(room.getId())),
                "A sala NÃO deve aparecer para o aluno APÓS a remoção (filtro active=true)");
    }

    @Test
    @DisplayName("[US24] findAvailableStudentsByRoomId deve omitir o aluno inativo")
    void findAvailableStudentsByRoomId_AfterSoftDelete_StudentDisappearsFromList() {
        // Arrange — antes da inativação, o aluno aparece como disponível
        List<User> before = roomMemberRepository.findAvailableStudentsByRoomId(room.getId());
        assertTrue(before.stream().anyMatch(u -> u.getId().equals(student.getId())),
                "O aluno deve aparecer nos disponíveis ANTES da remoção");

        // Act — soft delete
        member.setActive(false);
        member.setUnlinkedAt(Instant.now());
        roomMemberRepository.save(member);
        entityManager.flush();
        entityManager.clear();

        // Assert — aluno some da lista de disponíveis
        List<User> after = roomMemberRepository.findAvailableStudentsByRoomId(room.getId());
        assertFalse(after.stream().anyMatch(u -> u.getId().equals(student.getId())),
                "O aluno inativo NÃO deve aparecer nos disponíveis para grupo (filtro active=true)");
    }

    @Test
    @DisplayName("[US24] findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc (carômetro) deve omitir aluno inativo")
    void findByRoomIdAndRoleAndActiveTrue_AfterSoftDelete_StudentDisappearsFromCarometro() {
        // Arrange — antes: aluno visível no carômetro
        var before = roomMemberRepository.findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(
                room.getId(), Role.STUDENT, PageRequest.of(0, 20));
        assertTrue(before.stream().anyMatch(rm -> rm.getUser().getId().equals(student.getId())),
                "O aluno deve aparecer no carômetro ANTES da remoção");

        // Act — soft delete
        member.setActive(false);
        member.setUnlinkedAt(Instant.now());
        roomMemberRepository.save(member);
        entityManager.flush();
        entityManager.clear();

        // Assert — aluno some do carômetro
        var after = roomMemberRepository.findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(
                room.getId(), Role.STUDENT, PageRequest.of(0, 20));
        assertFalse(after.stream().anyMatch(rm -> rm.getUser().getId().equals(student.getId())),
                "O aluno inativo NÃO deve aparecer no carômetro (filtro active=true)");
    }

    @Test
    @DisplayName("[US24] unlinkedAt e active devem sobreviver ao flush/clear (persistência física confirmada)")
    void softDelete_UnlinkedAtAndActive_PersistAfterContextClear() {
        // Arrange
        Instant removedAt = Instant.now();
        member.setActive(false);
        member.setUnlinkedAt(removedAt);
        roomMemberRepository.save(member);
        entityManager.flush();
        entityManager.clear();

        // Act — releitura direta do banco
        RoomMember reloaded = roomMemberRepository.findById(member.getId()).orElseThrow();

        // Assert
        assertFalse(reloaded.isActive(), "active=false deve estar persistido fisicamente");
        assertNotNull(reloaded.getUnlinkedAt(), "unlinkedAt deve estar persistido fisicamente");
        // Tolerância de 1 segundo para serialização/desserialização de Instant no H2
        assertTrue(Math.abs(reloaded.getUnlinkedAt().getEpochSecond() - removedAt.getEpochSecond()) <= 1,
                "O unlinkedAt persistido deve corresponder ao instante da remoção");
    }
}
