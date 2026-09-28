package com.uefs.tfs.avaliasystem.US04;

import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * US04 — Integração: Controller + Service + Repository (H2) + RateLimitingService reais.
 * O limiter é singleton: cada teste usa um IP exclusivo.
 */
@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
class RoomJoinIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private RoomRepository roomRepository;
    @Autowired private UserRepository userRepository;
    @PersistenceContext private EntityManager entityManager;

    private User student;
    private Room room;

    @BeforeEach
    void setUp() {
        User tutor = persistUser("Tutor US04");
        student = persistUser("Aluno US04");

        room = new Room();
        room.setName("Sala US04");
        room.setAccessCode("JOIN01");
        room.setInviteLink("app/join/JOIN01");
        room.setTutor(tutor);
        room = roomRepository.save(room);
    }

    private RequestPostProcessor as(String userId) {
        return request -> { request.setUserPrincipal((Principal) () -> userId); return request; };
    }

    private void joinByCode(String code, String ip, int expectedStatus) throws Exception {
        mockMvc.perform(post("/api/v1/rooms/join")
                        .with(as(student.getId().toString()))
                        .header("X-Forwarded-For", ip)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"accessCode\":\"" + code + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    private long activeStudentLinks() {
        entityManager.flush();
        entityManager.clear();
        return entityManager.createQuery(
                        "SELECT COUNT(m) FROM RoomMember m WHERE m.user.id = :u AND m.room.id = :r " +
                                "AND m.role = :role AND m.active = true", Long.class)
                .setParameter("u", student.getId())
                .setParameter("r", room.getId())
                .setParameter("role", Role.STUDENT)
                .getSingleResult();
    }

    @Test
    @DisplayName("Código correto persiste vínculo ativo STUDENT no banco")
    void joinByCode_persistsStudentMembership() throws Exception {
        joinByCode("JOIN01", "10.0.0.1", 200);
        assertEquals(1, activeStudentLinks());
    }

    @Test
    @DisplayName("Link de convite persiste o vínculo sem digitar o código")
    void joinByInviteLink_persistsStudentMembership() throws Exception {
        mockMvc.perform(post("/api/v1/rooms/join/{code}", "JOIN01")
                        .with(as(student.getId().toString()))
                        .header("X-Forwarded-For", "10.0.0.2"))
                .andExpect(status().isOk());
        assertEquals(1, activeStudentLinks());
    }

    @Test
    @DisplayName("Ingressar duas vezes não duplica o vínculo")
    void joinTwice_doesNotDuplicate() throws Exception {
        joinByCode("JOIN01", "10.0.0.3", 200);
        joinByCode("JOIN01", "10.0.0.3", 200);
        assertEquals(1, activeStudentLinks());
    }

    @Test
    @DisplayName("5 códigos errados seguidos bloqueiam o IP; a 6ª (mesmo correta) retorna 429 e não vincula")
    void fiveWrongCodes_blockIp() throws Exception {
        for (int i = 1; i <= 5; i++) joinByCode("ERR" + i + "00", "10.0.0.4", 404);

        joinByCode("JOIN01", "10.0.0.4", 429);

        assertEquals(0, activeStudentLinks());
    }

    @Test
    @DisplayName("4 erros seguidos não bloqueiam; acerto na 5ª tentativa ingressa")
    void fourWrongCodes_doNotBlock() throws Exception {
        for (int i = 1; i <= 4; i++) joinByCode("ERR" + i + "00", "10.0.0.5", 404);

        joinByCode("JOIN01", "10.0.0.5", 200);
    }

    @Test
    @DisplayName("Acerto zera a sequência: 4 erros + acerto + 4 erros não bloqueiam")
    void successResetsFailureStreak() throws Exception {
        for (int i = 1; i <= 4; i++) joinByCode("ERR" + i + "00", "10.0.0.6", 404);
        joinByCode("JOIN01", "10.0.0.6", 200);
        for (int i = 1; i <= 4; i++) joinByCode("BAD" + i + "00", "10.0.0.6", 404);
    }

    @Test
    @DisplayName("Bloqueio de um IP não afeta outro IP")
    void blockDoesNotAffectOtherIp() throws Exception {
        for (int i = 1; i <= 5; i++) joinByCode("ERR" + i + "00", "10.0.0.7", 404);

        joinByCode("JOIN01", "10.0.0.8", 200);
    }

    private User persistUser(String name) {
        User u = new User();
        u.setName(name);
        u.setEmail(name.replaceAll("\\s+", "").toLowerCase() + "_" + UUID.randomUUID().toString().substring(0, 6) + "@teste.com");
        u.setPassword("senha123");
        return userRepository.save(u);
    }
}
