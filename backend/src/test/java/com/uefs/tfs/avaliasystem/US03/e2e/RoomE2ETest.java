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
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;

// NÍVEL: E2E (topo da pirâmide — poucos testes, os mais lentos, os mais caros).
// Diferença para o RoomIntegrationTest: aqui não usamos MockMvc (que ainda roda "dentro"
// da JVM de teste). Subimos um servidor Servlet real em porta aleatória e batemos nele
// via HTTP de verdade com TestRestTemplate, exatamente como um cliente externo (app
// mobile/web) faria. Nenhuma camada é mockada ou substituída, exceto o banco físico,
// que trocamos por H2 em memória para o teste ser determinístico e não sujar dados reais.
//
// ASSUNÇÃO DE AUTENTICAÇÃO: os testes unitários (RoomControllerTest) resolvem o usuário
// autenticado via Principal, presumivelmente populado por um filtro que lê um JWT.
// Como a geração real de token não está entre os arquivos enviados, assume-se aqui que
// existe (ou deverá existir) um filtro de segurança, ativo no perfil "test", que aceita
// o header "X-User-Id" e o expõe como Principal — suficiente para exercitar o
// comportamento de ponta a ponta sem acoplar este teste à biblioteca de JWT escolhida.
// Se a equipe implementar autenticação real, troque authHeadersFor() por geração de um
// token JWT válido; o restante do teste (asserts de negócio) não muda.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = Replace.ANY)
@AutoConfigureTestRestTemplate
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
        tutor = userRepository.save(tutor);
    }

    // Sem @Transactional aqui: o servidor real processa a requisição em outra thread,
    // então uma transação de teste não englobaria a chamada HTTP. A limpeza é manual.
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

    private HttpEntity<Object> authenticatedRequest(Object body, String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId); // ver ASSUNÇÃO DE AUTENTICAÇÃO acima
        return new HttpEntity<>(body, headers);
    }

    // --- JORNADA 1: ciclo de vida completo de uma Sala, criada por um Tutor real ---

    @Test
    @DisplayName("[E2E] Tutor cria, edita e exclui sua própria sala com sucesso, de ponta a ponta")
    void tutorLifecycle_CreateUpdateDelete_WorksEndToEnd() {
        // 1) Criação
        RoomRequest createRequest = new RoomRequest("Sala de Aceite E2E");
        ResponseEntity<RoomResponse> createResponse = restTemplate.postForEntity(
                url("/api/v1/rooms"),
                authenticatedRequest(createRequest, tutor.getId()),
                RoomResponse.class);

        assertEquals(HttpStatus.CREATED, createResponse.getStatusCode());
        assertNotNull(createResponse.getBody());
        String code = createResponse.getBody().getCode();
        assertTrue(createResponse.getBody().getJoinLink().contains(code));

        Room criada = roomRepository.findByAccessCode(code).orElseThrow();

        // 2) Edição
        RoomRequest updateRequest = new RoomRequest("Sala de Aceite E2E - Renomeada");
        ResponseEntity<RoomResponse> updateResponse = restTemplate.exchange(
                url("/api/v1/rooms/" + criada.getId()),
                HttpMethod.PUT,
                authenticatedRequest(updateRequest, tutor.getId()),
                RoomResponse.class);

        assertEquals(HttpStatus.OK, updateResponse.getStatusCode());
        entityManager.clear();
        assertEquals("Sala de Aceite E2E - Renomeada", roomRepository.findById(criada.getId()).orElseThrow().getName());

        // 3) Exclusão
        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                url("/api/v1/rooms/" + criada.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, tutor.getId()),
                Void.class);

        assertEquals(HttpStatus.NO_CONTENT, deleteResponse.getStatusCode());
        assertTrue(roomRepository.findById(criada.getId()).isEmpty());
    }

    // --- JORNADA 2: um usuário não pode mexer na sala de outro ---

    @Test
    @DisplayName("[E2E] Usuário que não é o Tutor não consegue editar nem excluir a sala de outra pessoa")
    void securityJourney_NonTutorCannotEditOrDeleteOthersRoom() {
        Room roomDeOutroTutor = persistRoom("E2E-SEC", "Sala Alheia");
        User usuarioMalicioso = persistUser("Usuário Malicioso");

        ResponseEntity<String> updateAttempt = restTemplate.exchange(
                url("/api/v1/rooms/" + roomDeOutroTutor.getId()),
                HttpMethod.PUT,
                authenticatedRequest(new RoomRequest("Nome Roubado"), usuarioMalicioso.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, updateAttempt.getStatusCode());

        ResponseEntity<String> deleteAttempt = restTemplate.exchange(
                url("/api/v1/rooms/" + roomDeOutroTutor.getId()),
                HttpMethod.DELETE,
                authenticatedRequest(null, usuarioMalicioso.getId()),
                String.class);
        assertEquals(HttpStatus.FORBIDDEN, deleteAttempt.getStatusCode());

        // Nada mudou de fato no banco
        entityManager.clear();
        Room intacta = roomRepository.findById(roomDeOutroTutor.getId()).orElseThrow();
        assertEquals("Sala Alheia", intacta.getName());
    }

    // --- JORNADA 3: validação de entrada é respeitada de ponta a ponta ---

    @Test
    @DisplayName("[E2E] Requisição com nome inválido é rejeitada com 400 e nada é persistido")
    void validationJourney_InvalidNameIsRejected_AndNothingIsPersisted() {
        long totalAntes = roomRepository.count();

        ResponseEntity<String> response = restTemplate.postForEntity(
                url("/api/v1/rooms"),
                authenticatedRequest(new RoomRequest("AB"), tutor.getId()),
                String.class);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(totalAntes, roomRepository.count());
    }

    // --- JORNADA 4 (US03): listagem reflete o vínculo real do usuário com a sala ---

    @Test
    @DisplayName("[E2E][US03] Sala aparece na listagem do Tutor e do membro ativo, some para removido e para estranho")
    void listingJourney_ReflectsRealMembershipAcrossFullStack() {
        Room sala = persistRoom("E2E-LIST", "Sala Compartilhada");
        User alunoAtivo = persistUser("Aluno Ativo E2E");
        persistMember(sala, alunoAtivo, true, null);
        User exAluno = persistUser("Ex-Aluno E2E");
        persistMember(sala, exAluno, false, Instant.now());
        User estranho = persistUser("Estranho E2E");

        assertRoomVisibleTo(tutor.getId(), sala.getId());
        assertRoomVisibleTo(alunoAtivo.getId(), sala.getId());
        assertRoomNotVisibleTo(exAluno.getId());
        assertRoomNotVisibleTo(estranho.getId());
    }

    @SuppressWarnings("unchecked")
    private void assertRoomVisibleTo(String userId, String expectedRoomId) {
        ResponseEntity<List> response = restTemplate.exchange(
                url("/api/v1/rooms"),
                HttpMethod.GET,
                authenticatedRequest(null, userId),
                List.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        List<?> body = response.getBody();
        assertNotNull(body);
        assertEquals(1, body.size(), "Esperava exatamente uma sala visível para o usuário " + userId);
    }

    @SuppressWarnings("unchecked")
    private void assertRoomNotVisibleTo(String userId) {
        ResponseEntity<List> response = restTemplate.exchange(
                url("/api/v1/rooms"),
                HttpMethod.GET,
                authenticatedRequest(null, userId),
                List.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody() == null || response.getBody().isEmpty());
    }

    // Helpers de massa de dados

    private User persistUser(String name) {
        User user = new User();
        user.setName(name);
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