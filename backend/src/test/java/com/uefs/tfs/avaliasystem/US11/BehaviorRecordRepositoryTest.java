package com.uefs.tfs.avaliasystem.US11;

import com.uefs.tfs.avaliasystem.model.BehaviorRecord;
import com.uefs.tfs.avaliasystem.model.BehaviorTag;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.BehaviorRecordRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorTagRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// Fatia de persistência apenas (H2 em memória, sem servidor web); cada teste sofre rollback
@DataJpaTest
@DisplayName("[US11] Repository de registro de comportamento")
class BehaviorRecordRepositoryTest {

    @Autowired
    private BehaviorRecordRepository behaviorRecordRepository;

    @Autowired
    private BehaviorTagRepository behaviorTagRepository;

    @Autowired
    private TestEntityManager entityManager;

    private final Instant RECORDED_AT = Instant.parse("2026-10-12T14:00:00Z");

    private User tutor;
    private User student;
    private Room room;
    private TutoringSession session;
    private BehaviorTag lateTag;

    // Tutor, Sala, Problema, Sessão e Tag precisam existir fisicamente para satisfazer as chaves estrangeiras
    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor Comportamento");
        student = persistUser("Aluno Comportamento");
        room = persistRoom("Sala do Comportamento");
        session = persistSession(room);
        lateTag = persistTag(room, "Atraso US11");
    }

    // --- TAGS PREDEFINIDAS ---

    @Test
    @DisplayName("Deve listar as tags predefinidas em ordem alfabética")
    void findAllByRoomIdOrderByNameAsc_ReturnsRoomTagsSortedByName() {
        // Inseridas fora de ordem de propósito: a ordem precisa vir do banco
        persistTag(room, "Celular fora de contexto US11");
        persistTag(room, "Boa argumentação US11");
        persistTag(persistRoom("Outra Sala"), "Tag de outra sala US11");
        entityManager.clear();

        List<BehaviorTag> tags = behaviorTagRepository.findAllByRoomIdOrderByNameAsc(room.getId());

        assertEquals(
                List.of("Atraso US11", "Boa argumentação US11", "Celular fora de contexto US11"),
                tags.stream().map(BehaviorTag::getName).toList());
        assertTrue(tags.stream().allMatch(tag -> room.getId().equals(tag.getRoom().getId())));
    }

    // --- GRAVAÇÃO ---

    @Test
    @DisplayName("Deve gravar o registro com tag ligado à sessão, ao aluno e à tag, com horário e sem texto")
    void save_WithTag_PersistsLinkedToSessionStudentAndTag() {
        UUID savedId = behaviorRecordRepository.save(newRecord(lateTag, null)).getId();

        // Força a leitura abaixo a ir ao banco, e não ao contexto de persistência
        entityManager.flush();
        entityManager.clear();

        BehaviorRecord found = behaviorRecordRepository.findById(savedId).orElseThrow();
        assertEquals(session.getId(), found.getSession().getId());
        assertEquals(student.getId(), found.getStudent().getId());
        assertEquals(lateTag.getId(), found.getTag().getId());
        assertEquals("Atraso US11", found.getTag().getName());
        assertNull(found.getText());
        assertEquals(RECORDED_AT, found.getRecordedAt());
    }

    @Test
    @DisplayName("[QA] Deve gravar por inteiro um texto livre com exatamente 500 caracteres, sem tag")
    void save_WithTextAtLimit_PersistsWholeTextWithoutTag() {
        // O último caractere é distinto: um truncamento (ex.: coluna padrão de 255) seria detectado
        String textAtLimit = "x".repeat(499) + "!";

        UUID savedId = behaviorRecordRepository.save(newRecord(null, textAtLimit)).getId();
        entityManager.flush();
        entityManager.clear();

        BehaviorRecord found = behaviorRecordRepository.findById(savedId).orElseThrow();
        assertEquals(textAtLimit, found.getText());
        assertNull(found.getTag());
    }

    @Test
    @DisplayName("Deve manter registros separados quando a mesma tag é aplicada duas vezes ao mesmo aluno na sessão")
    void save_SameTagTwiceForSameStudentInSession_KeepsTwoRows() {
        // Cada toque na tag é uma ocorrência: não pode haver restrição de unicidade sessão + aluno + tag
        behaviorRecordRepository.save(newRecord(lateTag, null));
        behaviorRecordRepository.save(newRecord(lateTag, null));
        entityManager.flush();
        entityManager.clear();

        assertEquals(2, behaviorRecordRepository.count());
    }

    // Helpers

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        // Sufixo UUID evita colisão no e-mail único
        user.setEmail("us11_" + UUID.randomUUID().toString().substring(0, 8) + "@teste.com");
        user.setPassword("senha123");
        return entityManager.persistFlushFind(user);
    }

    private Room persistRoom(String name) {
        String code = UUID.randomUUID().toString().substring(0, 5);
        Room room = new Room();
        room.setName(name);
        room.setAccessCode(code);
        room.setInviteLink("app/join/" + code);
        room.setTutor(tutor);
        return entityManager.persistFlushFind(room);
    }

    private TutoringSession persistSession(Room room) {
        Problem problem = new Problem();
        problem.setTitle("Problema 1");
        problem.setRoom(room);
        problem.setCreatedAt(RECORDED_AT.minusSeconds(86400));
        problem.setOrderIndex(1);
        problem.setSelfAssessmentReleased(false);
        problem = entityManager.persistFlushFind(problem);

        TutoringSession newSession = new TutoringSession();
        newSession.setProblem(problem);
        return entityManager.persistFlushFind(newSession);
    }

    private BehaviorTag persistTag(Room room, String name) {
        BehaviorTag tag = new BehaviorTag();
        tag.setRoom(room);
        tag.setName(name);
        return entityManager.persistFlushFind(tag);
    }

    private BehaviorRecord newRecord(BehaviorTag tag, String text) {
        BehaviorRecord record = new BehaviorRecord();
        record.setSession(session);
        record.setStudent(student);
        record.setTag(tag);
        record.setText(text);
        record.setRecordedAt(RECORDED_AT);
        return record;
    }
}
