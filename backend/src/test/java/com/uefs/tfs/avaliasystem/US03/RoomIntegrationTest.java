package com.uefs.tfs.avaliasystem.US03;

import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import tools.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// NÍVEL: INTEGRAÇÃO (meio da pirâmide).
// Diferente do RoomControllerTest (@WebMvcTest, Service mockado) e do RoomServiceTest
// (Mockito, Repository mockado), aqui SOBE O CONTEXTO SPRING INTEIRO: Controller real,
// Service real e Repository real conversando com um banco H2 físico via MockMvc.
// Objetivo: pegar bugs de "colagem" entre camadas que os testes isolados não veem
// (ex.: mapeamento de exceção -> status HTTP, serialização real do DTO, transação
// atravessando as três camadas).
@SpringBootTest
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
        tutor = userRepository.save(tutor);
    }

    // Injeta um Principal diretamente na requisição do MockMvc, sem depender de login
    // real (JWT) nem de mocks do Service. Suficiente aqui porque o objetivo deste
    // nível é validar a colaboração Controller->Service->Repository->DB, não o
    // mecanismo de autenticação em si (isso cabe ao teste E2E / a testes de segurança dedicados).
    private RequestPostProcessor authenticatedAs(String userId) {
        return request -> {
            request.setUserPrincipal((Principal) () -> userId);
            return request;
        };
    }

    // --- CRIAÇÃO PONTA A PONTA (sem nenhum mock) ---

    @Test
    @DisplayName("POST /rooms deve atravessar Controller, Service e Repository e persistir a linha de fato no banco")
    void createRoom_ThroughFullStack_PersistsRealRowInDatabase() throws Exception {
        RoomRequest request = new RoomRequest("Sala de Integração Full Stack");

        String responseBody = mockMvc.perform(post("/api/v1/rooms")
                        .with(authenticatedAs(tutor.getId()))
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
                        .with(authenticatedAs(tutor.getId()))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk());

        entityManager.flush();
        entityManager.clear();

        Room reloaded = roomRepository.findById(room.getId()).orElseThrow();
        assertEquals("Nome Atualizado via Integração", reloaded.getName());
    }

    @Test
    @DisplayName("PUT /rooms/{id} por usuário que não é o Tutor deve responder com erro HTTP e não alterar o banco")
    void updateRoom_ByUnauthorizedUser_ReturnsErrorStatus_AndDoesNotPersistChange() throws Exception {
        Room room = persistRoom("INT02", "Nome Protegido");
        User outroUsuario = persistUser("Invasor");
        RoomRequest updateRequest = new RoomRequest("Nome Hackeado");

        // ASSUNÇÃO: espera-se um @ControllerAdvice mapeando SecurityException (lançada
        // pelo Service, conforme RoomServiceTest) para HTTP 403 Forbidden. Caso o
        // handler global ainda não exista, este teste serve como especificação TDD dele.
        mockMvc.perform(put("/api/v1/rooms/{id}", room.getId())
                        .with(authenticatedAs(outroUsuario.getId()))
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
                        .with(authenticatedAs(tutor.getId())))
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
        mockMvc.perform(get("/api/v1/rooms").with(authenticatedAs(tutor.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(roomDoTutor.getId()));

        // Membro ativo vê a sala
        mockMvc.perform(get("/api/v1/rooms").with(authenticatedAs(alunoAtivo.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // Ex-membro (soft delete) não vê
        mockMvc.perform(get("/api/v1/rooms").with(authenticatedAs(exAluno.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Usuário sem vínculo não vê
        mockMvc.perform(get("/api/v1/rooms").with(authenticatedAs(semVinculo.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
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
        entityManager.persist(member);
        entityManager.flush();
    }
}