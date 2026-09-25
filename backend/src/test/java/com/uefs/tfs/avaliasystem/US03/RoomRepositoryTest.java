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

import static org.junit.jupiter.api.Assertions.*;

// Sobe um banco em memória (H2) focado apenas na persistência, sem servidor web.
// Roda cada teste em uma transação isolada que sofre rollback no final.
@DataJpaTest
class RoomRepositoryTest {

    @Autowired
    private RoomRepository roomRepository;

    // Ferramenta nativa para testes JPA. Permite interagir com o banco
    // contornando o repositório que está sendo testado.
    @Autowired
    private TestEntityManager entityManager;

    private User tutor;

    // Roda antes de CADA teste. Persiste o Tutor fisicamente no banco
    // para satisfazer a chave estrangeira (FK) exigida pela Sala.
    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setName("Tutor Persistido");
        tutor = entityManager.persistFlushFind(tutor);
    }

    // --- COMUNICAÇÃO REAL COM O BANCO ---

    @Test
    @DisplayName("save deve gravar a Sala no banco de fato, não só no cache de persistência")
    void save_PersistsRoomToDatabase_AndSurvivesContextClear() {
        Room room = new Room();
        room.setName("Módulo de Testes de Integração");
        room.setAccessCode("XYZ99");
        room.setInviteLink("app/join/XYZ99");
        room.setTutor(tutor);

        Room saved = roomRepository.save(room);
        String savedId = saved.getId();

        // Limpa o cache da memória (Hibernate). Garante que o findById abaixo
        // precise ir ao banco de dados físico para encontrar a informação.
        entityManager.flush();
        entityManager.clear();

        Optional<Room> found = roomRepository.findById(savedId);
        assertTrue(found.isPresent(), "O registro deve existir fisicamente no banco após o clear do contexto");
        // Confere que todas as colunas do ERD vieram do banco, não da memória
        assertEquals("Módulo de Testes de Integração", found.get().getName());
        assertEquals("XYZ99", found.get().getAccessCode());
        assertEquals("app/join/XYZ99", found.get().getInviteLink());
        assertEquals(tutor.getId(), found.get().getTutor().getId());
    }

    // --- ISOLAMENTO E ATUALIZAÇÃO ---

    @Test
    @DisplayName("save sobre uma Sala já existente e desanexada deve fazer UPDATE, não duplicar a linha")
    void save_OnDetachedExistingRoom_UpdatesInPlace_DoesNotDuplicate() {
        Room room = persistRoom("UPD01", "Nome Antigo");
        String roomId = room.getId();

        // Simula a chegada de dados em uma requisição HTTP diferente (entidade "fria")
        entityManager.clear();
        long countBefore = roomRepository.count();

        Room reloaded = roomRepository.findById(roomId).orElseThrow();
        reloaded.setName("Nome Atualizado");
        roomRepository.save(reloaded);

        entityManager.flush();
        entityManager.clear();

        // Garante que não houve INSERT, apenas UPDATE
        assertEquals(countBefore, roomRepository.count());
        // E que o valor realmente mudou no banco (não só que a contagem bateu)
        assertEquals("Nome Atualizado", roomRepository.findById(roomId).orElseThrow().getName());
    }

    // --- LISTAGEM (US03: "listar salas" = Tutor OU membro ativo em SALA_MEMBRO) ---
    

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
        // ativo=false simula o soft delete descrito no ERD
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

        // DISTINCT deve evitar que a mesma Sala apareça duas vezes
        assertEquals(1, result.size());
    }

    // --- RESTRIÇÃO UNIQUE ---

    @Test
    @DisplayName("Deve rejeitar a persistência de duas Salas com o mesmo codigo_acesso (restrição UQ do ERD)")
    void save_WithDuplicateAccessCode_ViolatesUniqueConstraint() {
        persistRoom("DUP01", "Sala Original");

        Room duplicate = new Room();
        duplicate.setName("Sala Duplicada");
        duplicate.setAccessCode("DUP01");
        duplicate.setInviteLink("app/join/DUP01");
        duplicate.setTutor(tutor);

        // Espera que o Spring dispare um erro de violação de integridade física no banco
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

    // Helpers: Métodos auxiliares privados para evitar repetição de código
    // na criação de massas de dados para os cenários de teste.
    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
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