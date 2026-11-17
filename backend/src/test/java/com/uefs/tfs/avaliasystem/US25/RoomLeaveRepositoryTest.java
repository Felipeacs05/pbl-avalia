package com.uefs.tfs.avaliasystem.US25;

import com.uefs.tfs.avaliasystem.model.*;
import com.uefs.tfs.avaliasystem.repository.NotificationRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
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

@DataJpaTest
@DisplayName("[US25] Repositories - notificações e filtros de vínculo ativo")
class RoomLeaveRepositoryTest {

    @Autowired private NotificationRepository notificationRepository;
    @Autowired private RoomMemberRepository roomMemberRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private TestEntityManager em;

    private User tutor;
    private User otherTutor;
    private User student;
    private Room room;
    private RoomMember member;

    @BeforeEach
    void setUp() {
        tutor = user("Tutor");
        otherTutor = user("Outro Tutor");
        student = user("Aluno");
        room = room("US25A", tutor);
        member = new RoomMember();
        member.setRoom(room); member.setUser(student); member.setRole(Role.STUDENT); member.setActive(true);
        member = em.persistFlushFind(member);
    }

    @Test
    @DisplayName("notificações do destinatário vêm ordenadas por createdAt desc e isoladas por tutor")
    void notificationsAreOrderedAndIsolatedByRecipient() {
        Instant base = Instant.parse("2026-11-01T10:00:00Z");
        notification(tutor, "primeira", base);
        notification(tutor, "terceira", base.plusSeconds(7200));
        notification(tutor, "segunda", base.plusSeconds(3600));
        notification(otherTutor, "de outro tutor", base);
        em.clear();

        List<Notification> result = notificationRepository.findAllByRecipientIdOrderByCreatedAtDesc(tutor.getId());

        assertEquals(3, result.size());
        assertEquals(base.plusSeconds(7200), result.get(0).getCreatedAt());
        assertEquals(base.plusSeconds(3600), result.get(1).getCreatedAt());
        assertEquals(base, result.get(2).getCreatedAt());
        assertTrue(result.stream().allMatch(n -> n.getRecipient().getId().equals(tutor.getId())));
    }

    @Test
    @DisplayName("após inativar o vínculo, filtros active=true deixam de enxergar o aluno")
    void activeFiltersStopSeeingStudentAfterLeaving() {
        assertTrue(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), student.getId()));
        assertEquals(1, roomRepository.findRoomsByParticipantId(student.getId()).size());

        member.setActive(false);
        member.setUnlinkedAt(Instant.parse("2026-11-16T15:00:00Z"));
        em.persistAndFlush(member);
        em.clear();

        assertFalse(roomMemberRepository.existsByRoomIdAndUserIdAndActiveTrue(room.getId(), student.getId()));
        assertTrue(roomRepository.findRoomsByParticipantId(student.getId()).isEmpty());
        assertTrue(roomRepository.findAllByTutorOrActiveMember(student.getId()).isEmpty());
        assertFalse(roomRepository.existsByIdAndTutorOrActiveMember(room.getId(), student.getId()));
        assertTrue(roomMemberRepository.findByRoomIdAndActiveTrueAndRole(room.getId(), Role.STUDENT).isEmpty());
        assertTrue(roomMemberRepository.findAllByRoomIdAndActiveTrueOrderByUserNameAsc(room.getId()).isEmpty());
        // a linha continua lá (soft delete)
        assertTrue(roomMemberRepository.findByRoomIdAndUserId(room.getId(), student.getId()).isPresent());
    }

    private User user(String name) {
        User u = new User();
        u.setName(name);
        u.setEmail(name.replace(" ", "").toLowerCase() + "." + UUID.randomUUID() + "@test.local");
        u.setPassword("senha123");
        return em.persistFlushFind(u);
    }

    private Room room(String code, User owner) {
        Room r = new Room();
        r.setName("Sala " + code); r.setAccessCode(code); r.setInviteLink("app/join/" + code); r.setTutor(owner);
        return em.persistFlushFind(r);
    }

    private void notification(User recipient, String label, Instant createdAt) {
        Notification n = new Notification();
        n.setRecipient(recipient); n.setRoom(room); n.setStudent(student);
        n.setType(NotificationType.STUDENT_LEFT); n.setCreatedAt(createdAt);
        em.persistAndFlush(n);
    }
}