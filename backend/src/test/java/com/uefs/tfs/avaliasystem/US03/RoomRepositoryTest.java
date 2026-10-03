package com.uefs.tfs.avaliasystem.US03;

import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class RoomRepositoryTest {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User tutor;

    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setName("Tutor Persistido");

        tutor.setEmail("tutor_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        tutor.setPassword("senha123");

        tutor = entityManager.persistFlushFind(tutor);
    }

    @Test
    @DisplayName("save deve gravar a Sala no banco de fato, não só no cache de persistência")
    void save_PersistsRoomToDatabase_AndSurvivesContextClear() {
        Room room = new Room();
        room.setName("Módulo de Testes de Integração");
        room.setAccessCode("XYZ99");
        room.setInviteLink("app/join/XYZ99");
        room.setTutor(tutor);

        Room saved = roomRepository.save(room);
        UUID savedId = saved.getId();

        entityManager.flush();
        entityManager.clear();

        Optional<Room> found = roomRepository.findById(savedId);
        assertTrue(found.isPresent(), "O registro deve existir fisicamente no banco após o clear do contexto");
        assertEquals("Módulo de Testes de Integração", found.get().getName());
        assertEquals("XYZ99", found.get().getAccessCode());
        assertEquals("app/join/XYZ99", found.get().getInviteLink());
        assertEquals(tutor.getId(), found.get().getTutor().getId());
    }

    @Test
    @DisplayName("save sobre uma Sala já existente e desanexada deve fazer UPDATE, não duplicar a linha")
    void save_OnDetachedExistingRoom_UpdatesInPlace_DoesNotDuplicate() {
        Room room = persistRoom("UPD01", "Nome Antigo");
        UUID roomId = room.getId();

        entityManager.clear();
        long countBefore = roomRepository.count();

        Room reloaded = roomRepository.findById(roomId).orElseThrow();
        reloaded.setName("Nome Atualizado");
        roomRepository.save(reloaded);

        entityManager.flush();
        entityManager.clear();

        assertEquals(countBefore, roomRepository.count());
        assertEquals("Nome Atualizado", roomRepository.findById(roomId).orElseThrow().getName());
    }

    @Test
    @DisplayName("Deve listar Salas onde o usuário é o Tutor")
    void findAllByTutorOrActiveMember_IncludesRoomsWhereUserIsTutor() {
        Room room = persistRoom("TUT01", "Sala do Tutor");
        List<Room> result = roomRepository.findAllByTutorOrActiveMember(tutor.getId());
        assertEquals(1, result.size());
        assertEquals(room.getId(), result.get(0).getId());
    }

    @Test
    @DisplayName("Deve listar Salas onde o usuário é membro ativo, mesmo sem ser o Tutor")
    void findAllByTutorOrActiveMember_IncludesRoomsWhereUserIsActiveMember() {
        Room room = persistRoom("MEM01", "Sala com Membro");
        User aluno = persistUser("Aluno Ativo");
        persistMember(room, aluno, true, null);

        List<Room> result = roomRepository.findAllByTutorOrActiveMember(aluno.getId());

        assertEquals(1, result.size());
        assertEquals(room.getId(), result.get(0).getId());
    }

    @Test
    @DisplayName("NÃO deve listar Salas cujo vínculo em SALA_MEMBRO foi desativado (soft delete)")
    void findAllByTutorOrActiveMember_ExcludesRoomsWithInactiveMembership() {
        Room room = persistRoom("INA01", "Sala com Membro Removido");
        User exAluno = persistUser("Ex-Aluno");
        persistMember(room, exAluno, false, Instant.now());

        List<Room> result = roomRepository.findAllByTutorOrActiveMember(exAluno.getId());

        assertTrue(result.isEmpty(), "Um vínculo com ativo=false não pode aparecer na listagem");
    }

    @Test
    @DisplayName("NÃO deve listar Salas de usuários sem nenhum vínculo (nem Tutor, nem membro)")
    void findAllByTutorOrActiveMember_ExcludesUnrelatedRooms() {
        persistRoom("OUT01", "Sala de Outro Tutor");
        User semVinculo = persistUser("Sem Vínculo");

        List<Room> result = roomRepository.findAllByTutorOrActiveMember(semVinculo.getId());

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Não deve duplicar a Sala se o usuário for Tutor E também tiver registro em SALA_MEMBRO")
    void findAllByTutorOrActiveMember_DoesNotDuplicateWhenTutorIsAlsoMember() {
        Room room = persistRoom("DUP02", "Sala com Vínculo Duplo");
        persistMember(room, tutor, true, null);

        List<Room> result = roomRepository.findAllByTutorOrActiveMember(tutor.getId());

        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("Deve rejeitar a persistência de duas Salas com o mesmo codigo_acesso (restrição UQ do ERD)")
    void save_WithDuplicateAccessCode_ViolatesUniqueConstraint() {
        persistRoom("DUP01", "Sala Original");

        Room duplicate = new Room();
        duplicate.setName("Sala Duplicada");
        duplicate.setAccessCode("DUP01");
        duplicate.setInviteLink("app/join/DUP01");
        duplicate.setTutor(tutor);

        assertThrows(DataIntegrityViolationException.class,
                () -> roomRepository.saveAndFlush(duplicate));
    }

    @Test
    @DisplayName("existsByAccessCode deve permitir que a Service detecte colisão antes de tentar salvar")
    void existsByAccessCode_DetectsExistingCode() {
        persistRoom("CHK01", "Sala Existente");

        assertTrue(roomRepository.existsByAccessCode("CHK01"));
        assertFalse(roomRepository.existsByAccessCode("CHK02"));
    }

    // --- HELPERS ---

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // CORREÇÃO: E-mail único e senha preenchidos para satisfazer NOT NULL do banco
        user.setEmail(name.replaceAll("\\s+", "").toLowerCase() + "_" + UUID.randomUUID().toString().substring(0, 5) + "@teste.com");
        user.setPassword("senha123");
        return entityManager.persistFlushFind(user);
    }

    private RoomMember persistMember(Room room, User user, boolean active, Instant unlinkedAt) {
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        member.setUnlinkedAt(unlinkedAt);
        return entityManager.persistFlushFind(member);
    }

    private Room persistRoom(String code, String name) {
        Room room = new Room();
        room.setName(name);
        room.setAccessCode(code);
        room.setInviteLink("app/join/" + code);
        room.setTutor(tutor);
        return entityManager.persistFlushFind(room);
    }
}
