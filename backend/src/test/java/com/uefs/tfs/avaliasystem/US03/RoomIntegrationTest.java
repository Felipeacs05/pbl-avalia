package com.uefs.tfs.avaliasystem.US03;

import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
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
import com.uefs.tfs.avaliasystem.TestConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// NÍVEL: INTEGRAÇÃO (meio da pirâmide).
// Diferente do RoomControllerTest (@WebMvcTest, Service mockado) e do RoomServiceTest
// (Mockito, Repository mockado), aqui SOBE O CONTEXTO SPRING INTEIRO: Controller real,
// Service real e Repository real conversando com um banco H2 via MockMvc.
// Objetivo: pegar bugs de "colagem" entre camadas que os testes isolados não veem
// (ex.: mapeamento de exceção -> status HTTP, serialização real do DTO, transação
// atravessando as três camadas).
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY) // força H2 em memória, independente do datasource de produção
@Transactional // cada teste roda em transação própria com rollback automático (isolamento)
class RoomIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    // Usado para preparar massa de dados (ex.: RoomMember) que ainda não tem
    // repositório próprio exposto nos arquivos enviados.
    @PersistenceContext
    private EntityManager entityManager;

    private User tutor;

    @BeforeEach
    void setUp() {
        tutor = new User();
        tutor.setName("Tutora Integração");
        tutor.setEmail("tutora.int_" + UUID.randomUUID().toString().substring(0, 6) + "@teste.com");
        tutor.setPassword("senha123");
        tutor = userRepository.save(tutor);
    }

    // Autentica a requisição com um JWT simulado cujo "sub" é o id do usuário. O filtro de
    // segurança real (SecurityConfig) continua ativo; o que é dispensado aqui é apenas a
    // assinatura do token, pois o foco é a colaboração Controller->Service->Repository->DB.
    private RequestPostProcessor authenticatedAs(String userId) {
        return jwt().jwt(j -> j.subject(userId));
    }

    // --- CRIAÇÃO PONTA A PONTA (sem nenhum mock) ---

    @Test
    @DisplayName("POST /rooms deve atravessar Controller, Service e Repository e persistir a linha de fato no banco")
    void createRoom_ThroughFullStack_PersistsRealRowInDatabase() throws Exception {
        RoomRequest request = new RoomRequest("Sala de Integração Full Stack");

        String responseBody = mockMvc.perform(post("/api/v1/rooms")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        String codigoGerado = objectMapper.readTree(responseBody).get("code").asString();

        // A prova de que passou pelas 3 camadas de verdade: existe fisicamente no banco
        assertTrue(roomRepository.existsByAccessCode(codigoGerado),
                "O código retornado pela API deve corresponder a uma Sala realmente persistida");
    }

    // --- EDIÇÃO PONTA A PONTA ---

    @Test
    @DisplayName("PUT /rooms/{id} deve persistir a alteração de nome no banco através de todas as camadas")
    void updateRoom_ThroughFullStack_PersistsChangeInDatabase() throws Exception {
        Room room = persistRoom("INT01", "Nome Original");
        RoomRequest updateRequest = new RoomRequest("Nome Atualizado via Integração");

        mockMvc.perform(put("/api/v1/rooms/{id}", room.getId())
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());

        entityManager.flush();
        entityManager.clear();

        Room reloaded = roomRepository.findById(room.getId()).orElseThrow();
        assertEquals("Nome Atualizado via Integração", reloaded.getName());
    }

    @Test
    @DisplayName("PUT /rooms/{id} por usuário que não é o Tutor deve responder 403 e não alterar o banco")
    void updateRoom_ByUnauthorizedUser_ReturnsErrorStatus_AndDoesNotPersistChange() throws Exception {
        Room room = persistRoom("INT02", "Nome Protegido");
        User outroUsuario = persistUser("Invasor");
        RoomRequest updateRequest = new RoomRequest("Nome Hackeado");

        // O usuário está autenticado (JWT válido), mas não é o Tutor: o Service lança
        // ForbiddenOperationException, que o GlobalExceptionHandler mapeia para 403.
        mockMvc.perform(put("/api/v1/rooms/{id}", room.getId())
                        .with(authenticatedAs(outroUsuario.getId().toString()))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());

        entityManager.flush();
        entityManager.clear();
        assertEquals("Nome Protegido", roomRepository.findById(room.getId()).orElseThrow().getName());
    }

    // --- EXCLUSÃO PONTA A PONTA ---

    @Test
    @DisplayName("DELETE /rooms/{id} deve remover a linha do banco através de todas as camadas")
    void deleteRoom_ThroughFullStack_RemovesRowFromDatabase() throws Exception {
        Room room = persistRoom("INT03", "Sala a Excluir");

        mockMvc.perform(delete("/api/v1/rooms/{id}", room.getId())
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isNoContent());

        entityManager.flush();
        entityManager.clear();
        assertTrue(roomRepository.findById(room.getId()).isEmpty());
    }

    // --- LISTAGEM (US03) PONTA A PONTA ---
    // Repete, agora via HTTP real + banco real, a especificação já coberta em
    // RoomRepositoryTest no nível de persistência. Aqui validamos que o Controller
    // expõe corretamente essa regra de negócio ao cliente.

    @Test
    @DisplayName("[US03] GET /rooms deve listar para o Tutor e para membro ativo, mas nunca para membro removido ou estranho")
    void listRooms_ThroughFullStack_RespectsTutorAndActiveMembershipRule() throws Exception {
        Room roomDoTutor = persistRoom("INT04", "Sala do Tutor");
        User alunoAtivo = persistUser("Aluno Ativo");
        persistMember(roomDoTutor, alunoAtivo, true, null);

        User exAluno = persistUser("Ex-Aluno");
        persistMember(roomDoTutor, exAluno, false, Instant.now());

        User semVinculo = persistUser("Sem Vínculo");

        // Tutor vê a sala
        mockMvc.perform(get("/api/v1/rooms").with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(roomDoTutor.getId().toString()));

        // Membro ativo vê a sala
        mockMvc.perform(get("/api/v1/rooms").with(authenticatedAs(alunoAtivo.getId().toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // Ex-membro (soft delete) não vê
        mockMvc.perform(get("/api/v1/rooms").with(authenticatedAs(exAluno.getId().toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Usuário sem vínculo não vê
        mockMvc.perform(get("/api/v1/rooms").with(authenticatedAs(semVinculo.getId().toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
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
        entityManager.persist(member);
        entityManager.flush();
    }
}