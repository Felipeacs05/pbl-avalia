package com.uefs.tfs.avaliasystem.US03.e2e;

import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

// IMPORTS ATUALIZADOS PARA A VERSÃO CORRETA DO SEU SPRING BOOT
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
@Import(TestAuthenticationConfig.class)
class RoomE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;

    private User tutor;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(transactionManager);
        tutor = new User();
        tutor.setName("Tutora E2E");
        tutor.setEmail("tutora.e2e_" + UUID.randomUUID().toString().substring(0, 6) + "@teste.com");
        tutor.setPassword("senha123");
        tutor = userRepository.save(tutor);
    }

    @AfterEach
    void tearDown() {
        transactionTemplate.executeWithoutResult(status ->
                entityManager.createQuery("DELETE FROM RoomMember").executeUpdate());
        roomRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    // Método focado apenas em retornar os headers para evitar ambiguidades no HttpEntity
    private HttpHeaders headersWithAuth(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);
        return headers;
    }

    // --- JORNADA 1: ciclo de vida completo de uma Sala, criada por um Tutor real ---

    @Test
    @DisplayName("[E2E] Tutor cria, edita e exclui sua própria sala com sucesso, de ponta a ponta")
    void tutorLifecycle_CreateUpdateDelete_WorksEndToEnd() {
        // 1) Criação
        RoomRequest createRequest = new RoomRequest("Sala de Aceite E2E");
        ResponseEntity<RoomResponse> createResponse = restTemplate.exchange(
                url("/api/v1/rooms"),
                HttpMethod.POST,
                new HttpEntity<>(createRequest, headersWithAuth(tutor.getId().toString())),
                RoomResponse.class);

        assertEquals(HttpStatus.CREATED, createResponse.getStatusCode());
        assertNotNull(createResponse.getBody());
        String code = createResponse.getBody().getCode();
        assertTrue(createResponse.getBody().getJoinLink().contains(code));

        // ... restante do teste

        Room criada = roomRepository.findByAccessCode(code).orElseThrow();

        // 2) Edição
        RoomRequest updateRequest = new RoomRequest("Sala de Aceite E2E - Renomeada");
        ResponseEntity<RoomResponse> updateResponse = restTemplate.exchange(
                url("/api/v1/rooms/" + criada.getId()),
                HttpMethod.PUT,
                new HttpEntity<>(updateRequest, headersWithAuth(tutor.getId().toString())),
                RoomResponse.class);

        assertEquals(HttpStatus.OK, updateResponse.getStatusCode());

        transactionTemplate.executeWithoutResult(status -> entityManager.clear());
        assertEquals("Sala de Aceite E2E - Renomeada", roomRepository.findById(criada.getId()).orElseThrow().getName());

        // 3) Exclusão
        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                url("/api/v1/rooms/" + criada.getId()),
                HttpMethod.DELETE,
                new HttpEntity<>(headersWithAuth(tutor.getId().toString())),
                Void.class);

        assertEquals(HttpStatus.NO_CONTENT, deleteResponse.getStatusCode());
        assertTrue(roomRepository.findById(criada.getId()).isEmpty());
    }

    // --- JORNADA 2: um utilizador não pode mexer na sala de outro ---

    @Test
    @DisplayName("[E2E] Usuário que não é o Tutor não consegue editar nem excluir a sala de outra pessoa")
    void securityJourney_NonTutorCannotEditOrDeleteOthersRoom() {
        Room roomDeOutroTutor = persistRoom("E2E-SEC", "Sala Alheia");
        User usuarioMalicioso = persistUser("Usuário Malicioso");

        // Edição Negada
        ResponseEntity<String> updateAttempt = restTemplate.exchange(
                url("/api/v1/rooms/" + roomDeOutroTutor.getId()),
                HttpMethod.PUT,
                new HttpEntity<>(new RoomRequest("Nome Roubado"), headersWithAuth(usuarioMalicioso.getId().toString())),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, updateAttempt.getStatusCode());

        // Exclusão Negada
        ResponseEntity<String> deleteAttempt = restTemplate.exchange(
                url("/api/v1/rooms/" + roomDeOutroTutor.getId()),
                HttpMethod.DELETE,
                new HttpEntity<>(headersWithAuth(usuarioMalicioso.getId().toString())),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, deleteAttempt.getStatusCode());

        transactionTemplate.executeWithoutResult(status -> entityManager.clear());
        Room intacta = roomRepository.findById(roomDeOutroTutor.getId()).orElseThrow();
        assertEquals("Sala Alheia", intacta.getName());
    }

    // --- JORNADA 3: validação de entrada é respeitada de ponta a ponta ---

    @Test
    @DisplayName("[E2E] Requisição com nome inválido é rejeitada com 400 e nada é persistido")
    void validationJourney_InvalidNameIsRejected_AndNothingIsPersisted() {
        long totalAntes = roomRepository.count();

        ResponseEntity<String> response = restTemplate.exchange(
                url("/api/v1/rooms"),
                HttpMethod.POST,
                new HttpEntity<>(new RoomRequest("AB"), headersWithAuth(tutor.getId().toString())),
                String.class);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(totalAntes, roomRepository.count());
    }

    // --- JORNADA 4 (US03): listagem reflete o vínculo real do utilizador com a sala ---

    @Test
    @DisplayName("[E2E][US03] Sala aparece na listagem do Tutor e do membro ativo, some para removido e para estranho")
    void listingJourney_ReflectsRealMembershipAcrossFullStack() {
        Room sala = persistRoom("E2E-LIST", "Sala Compartilhada");
        User alunoAtivo = persistUser("Aluno Ativo E2E");
        persistMember(sala, alunoAtivo, true, null);
        User exAluno = persistUser("Ex-Aluno E2E");
        persistMember(sala, exAluno, false, Instant.now());
        User estranho = persistUser("Estranho E2E");

        assertRoomVisibleTo(tutor.getId().toString(), sala.getId().toString());
        assertRoomVisibleTo(alunoAtivo.getId().toString(), sala.getId().toString());
        assertRoomNotVisibleTo(exAluno.getId().toString());
        assertRoomNotVisibleTo(estranho.getId().toString());
    }

    private void assertRoomVisibleTo(String userId, String expectedRoomId) {
        ResponseEntity<RoomResponse[]> response = restTemplate.exchange(
                url("/api/v1/rooms"),
                HttpMethod.GET,
                new HttpEntity<>(headersWithAuth(userId)),
                RoomResponse[].class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        RoomResponse[] body = response.getBody();
        assertNotNull(body);
        assertEquals(1, body.length, "Esperava exatamente uma sala visível para o utilizador " + userId);
        assertEquals(expectedRoomId, body[0].getId(), "O ID da sala retornada deve coincidir com o esperado");
    }

    private void assertRoomNotVisibleTo(String userId) {
        ResponseEntity<RoomResponse[]> response = restTemplate.exchange(
                url("/api/v1/rooms"),
                HttpMethod.GET,
                new HttpEntity<>(headersWithAuth(userId)),
                RoomResponse[].class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        RoomResponse[] body = response.getBody();
        assertTrue(body == null || body.length == 0, "Nenhuma sala devia estar visível para este utilizador");
    }

    // Helpers de massa de dados

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
        user.setEmail(name.replaceAll("\\s+", "").toLowerCase() + "_" + UUID.randomUUID().toString().substring(0, 6) + "@teste.com");
        user.setPassword("senha123");
        return userRepository.save(user);
    }

    private Room persistRoom(String code, String name) {
        Room room = new Room();
        room.setName(name);
        room.setAccessCode(code);
        room.setInviteLink("app/join/" + code);
        room.setTutor(tutor);
        return roomRepository.save(room);
    }

    private void persistMember(Room room, User user, boolean active, Instant unlinkedAt) {
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(active);
        member.setUnlinkedAt(unlinkedAt);
        transactionTemplate.executeWithoutResult(status -> {
            entityManager.persist(member);
            entityManager.flush();
        });
    }
}