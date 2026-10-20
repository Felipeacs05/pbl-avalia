package com.uefs.tfs.avaliasystem.US07;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.dto.CriterionRequest;
import com.uefs.tfs.avaliasystem.model.Criterion;
import com.uefs.tfs.avaliasystem.model.PerformanceTable;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.CriterionRepository;
import com.uefs.tfs.avaliasystem.repository.PerformanceTableRepository;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Testes de integração ponta a ponta (Spring Context completo + H2 em memória) para a US07.
 *
 * Contrato vigente:
 *   POST   /api/v1/rooms/{roomId}/criteria               → 201 Created
 *   GET    /api/v1/rooms/{roomId}/criteria               → 200 OK  (somente tutor)
 *   DELETE /api/v1/rooms/{roomId}/criteria/{criterionId} → 204 No Content
 *
 * Modelo (A): internamente a PerformanceTable ainda existe como entidade de persistência,
 * mas é completamente transparente para a API. Os helpers de massa criam a tabela
 * implicitamente ao persisitir os critérios ligados à sala.
 *
 * Sala inexistente → 404 Not Found (pendência: handler no GlobalExceptionHandler).
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = Replace.ANY)
@Transactional
@DisplayName("US07 - Testes de Integração Ponta a Ponta (Spring Context + H2 DB) — rota /api/v1/rooms/{roomId}/criteria")
class PerformanceTableIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private PerformanceTableRepository performanceTableRepository;
    @Autowired private CriterionRepository criterionRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomMemberRepository roomMemberRepository;

    private User tutor;
    private Room room;

    // -------------------------------------------------------------------------
    // Setup: cria tutor + sala antes de cada teste.
    // A PerformanceTable implícita é criada pelos helpers quando necessário.
    // -------------------------------------------------------------------------

    @BeforeEach
    void setUp() {
        tutor = persistUser("Tutor Integração", "tutor.us07." + uid() + "@avalia.edu");

        room = new Room();
        room.setName("Módulo Tutorial Integrado");
        room.setAccessCode("US07" + uid().toUpperCase());
        room.setTutor(tutor);
        room = roomRepository.save(room);
    }

    // -------------------------------------------------------------------------
    // Helpers de massa de dados
    // -------------------------------------------------------------------------

    private String uid() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    private RequestPostProcessor authenticatedAs(String userId) {
        return jwt().jwt(j -> j.subject(userId));
    }

    private User persistUser(String name, String email) {
        User u = new User();
        u.setName(name);
        u.setEmail(email);
        u.setPassword("senhaSegura123");
        return userRepository.save(u);
    }

    private Room persistRoom(String name, User tutorUser) {
        Room r = new Room();
        r.setName(name);
        r.setAccessCode("RM" + uid().toUpperCase());
        r.setTutor(tutorUser);
        return roomRepository.save(r);
    }

    /**
     * Cria a PerformanceTable implícita vinculada à sala (transparente para a API)
     * e retorna a instância para que os helpers de critério possam referenciá-la.
     */
    private PerformanceTable criarTabelaImplicita(Room r) {
        PerformanceTable table = new PerformanceTable();
        table.setName("Tabela Implícita da Sala " + r.getId());
        table.setRoom(r);
        return performanceTableRepository.save(table);
    }

    /**
     * Persiste um critério diretamente no banco vinculado à tabela implícita de uma sala.
     * Retorna o critério salvo com ID gerado.
     */
    private Criterion persistCriterion(Room r, String name, Double weight) {
        PerformanceTable table = performanceTableRepository.findByRoomId(r.getId())
                .stream().findFirst().orElseGet(() -> criarTabelaImplicita(r));

        Criterion c = new Criterion();
        c.setName(name);
        c.setDescription("Descrição de " + name);
        c.setWeight(weight);
        c.setPerformanceTable(table);
        return criterionRepository.save(c);
    }

    private RoomMember persistMembro(Room r, User u, Role role) {
        RoomMember m = new RoomMember();
        m.setRoom(r);
        m.setUser(u);
        m.setRole(role);
        m.setActive(true);
        return roomMemberRepository.save(m);
    }

    // =========================================================================
    // POST /api/v1/rooms/{roomId}/criteria — ADICIONAR CRITÉRIO
    // =========================================================================

    @Test
    @DisplayName("POST - Tutor da sala: deve persistir critério no banco H2 e retornar 201")
    void postCriterion_TutorDaSala_PersisteCriterioERetorna201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Postura", "Ética profissional", 4.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criterionId").isNotEmpty())
                .andExpect(jsonPath("$.criteriaName").value("Postura"));

        // Assert (Validar integridade do banco)
        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        assertFalse(tables.isEmpty(), "Deve existir a PerformanceTable implícita da sala");
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(tables.get(0).getId());
        assertEquals(1, criteria.size());
        assertEquals("Postura", criteria.get(0).getName());
    }

    @Test
    @DisplayName("POST - Sem token: deve retornar 401 e não persistir")
    void postCriterion_SemToken_Returns401ENaoPersiste() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Postura", "Ética", 2.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        // Assert (Validar banco intacto)
        assertTrue(performanceTableRepository.findByRoomId(room.getId()).isEmpty(),
                "Nenhum critério deve ser persistido sem autenticação");
    }

    @Test
    @DisplayName("POST - Tutor de OUTRA sala (IDOR): deve retornar 403 e banco intacto")
    void postCriterion_TutorDeOutraSala_Returns403EBancoIntacto() throws Exception {
        // Arrange (Preparar)
        User outroTutor = persistUser("Outro Tutor", "outro.tutor." + uid() + "@avalia.edu");
        Room outraSala = persistRoom("Outra Sala", outroTutor);
        // outroTutor é tutor da outraSala, mas não da room principal
        CriterionRequest request = new CriterionRequest("Tentativa Indevida", "Não autorizado", 1.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(outroTutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Assert (Validar banco intacto)
        assertTrue(performanceTableRepository.findByRoomId(room.getId()).isEmpty(),
                "Nenhum critério deve ser persistido quando usuário é tutor de outra sala");
    }

    @Test
    @DisplayName("POST - Aluno membro ativo da sala: deve retornar 403 e banco intacto")
    void postCriterion_AlunoMembroAtivo_Returns403EBancoIntacto() throws Exception {
        // Arrange (Preparar)
        User aluno = persistUser("Aluno da Sala", "aluno." + uid() + "@avalia.edu");
        persistMembro(room, aluno, Role.STUDENT);
        CriterionRequest request = new CriterionRequest("Tentativa de Aluno", "Sem permissão", 1.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(aluno.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        // Assert (Validar banco intacto)
        assertTrue(performanceTableRepository.findByRoomId(room.getId()).isEmpty(),
                "Nenhum critério deve ser persistido quando usuário é aluno da sala");
    }

    @Test
    @DisplayName("POST - Sala inexistente: deve retornar 404 e não persistir")
    void postCriterion_SalaInexistente_Returns404ENaoPersiste() throws Exception {
        // Arrange (Preparar)
        // Nota: este teste falhará até que o Leonardo adicione handler de IllegalStateException → 404
        // no GlobalExceptionHandler (hoje só IllegalArgumentException → 400 está mapeado).
        String salaInexistenteId = UUID.randomUUID().toString();
        CriterionRequest request = new CriterionRequest("Liderança", "Proatividade", 1.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(post("/api/v1/rooms/" + salaInexistenteId + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // =========================================================================
    // POST - Payloads inválidos (reaproveitando InvalidCriterionPayloads)
    // =========================================================================

    @ParameterizedTest(name = "[{index}] Rejeição no H2 para: {0}")
    @MethodSource("com.uefs.tfs.avaliasystem.US07.InvalidCriterionPayloads#provideInvalidCriterionRequests")
    @DisplayName("POST - Payload inválido: deve retornar 400 e não persistir nada no banco H2")
    void postCriterion_PayloadInvalido_Returns400ENaoPersiste(String scenario, CriterionRequest invalidRequest) throws Exception {
        // Arrange (Preparar)
        int countAntes = criterionRepository.findAll().size();

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors").isMap());

        // Assert (Validar banco intacto)
        assertEquals(countAntes, criterionRepository.findAll().size(),
                "Nenhum registro deve ser inserido no banco para payload inválido: " + scenario);
    }

    @Test
    @DisplayName("POST - Nome com 255 caracteres (limite máximo): deve persistir no banco com 201")
    void postCriterion_NomeCom255Caracteres_PersisteCom201() throws Exception {
        // Arrange (Preparar)
        String nomeLimite = "A".repeat(255);
        CriterionRequest request = new CriterionRequest(nomeLimite, "Descrição no limite", 2.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criterionId").isNotEmpty())
                .andExpect(jsonPath("$.criteriaName").value(nomeLimite));

        // Assert (Validar)
        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(tables.get(0).getId());
        assertEquals(1, criteria.size());
        assertEquals(nomeLimite, criteria.get(0).getName());
    }

    @Test
    @DisplayName("POST - Peso zero (0.0): deve persistir no banco com 201")
    void postCriterion_PesoZero_PersisteCom201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Atividade Formativa", "Sem peso na nota final", 0.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(0.0));

        // Assert (Validar)
        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(tables.get(0).getId());
        assertEquals(0.0, criteria.get(0).getWeight());
    }

    @Test
    @DisplayName("POST - Peso omitido: deve persistir com peso padrão 1.0")
    void postCriterion_PesoOmitido_PersisteCom201EPesoPadrao() throws Exception {
        // Arrange (Preparar)
        String jsonSemPeso = "{\"criteriaName\": \"Participação Efetiva\", \"criteriaDescription\": \"Presença ativa\"}";

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonSemPeso))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaWeight").value(1.0));

        // Assert (Validar)
        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(tables.get(0).getId());
        assertEquals(1.0, criteria.get(0).getWeight(), "O peso gravado no banco deve ser 1.0 por padrão");
    }

    @Test
    @DisplayName("POST - Nome somente com hífens (\"---\"): deve persistir com 201")
    void postCriterion_NomeSomenteHifens_PersisteCom201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("---", "Critério separador", 1.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("---"));

        // Assert (Validar)
        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(tables.get(0).getId());
        assertEquals(1, criteria.size());
        assertEquals("---", criteria.get(0).getName());
    }

    @Test
    @DisplayName("POST - Nome com acentos da língua portuguesa: deve persistir com 201")
    void postCriterion_NomeComAcentos_PersisteCom201() throws Exception {
        // Arrange (Preparar)
        CriterionRequest request = new CriterionRequest("Raciocínio Lógico e Dedução", "Capacidade analítica", 3.0);

        // Act (Executar)
        mockMvc.perform(post("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.criteriaName").value("Raciocínio Lógico e Dedução"));

        // Assert (Validar)
        List<PerformanceTable> tables = performanceTableRepository.findByRoomId(room.getId());
        List<Criterion> criteria = criterionRepository.findByPerformanceTableId(tables.get(0).getId());
        assertEquals(1, criteria.size());
        assertEquals("Raciocínio Lógico e Dedução", criteria.get(0).getName());
    }

    // =========================================================================
    // GET /api/v1/rooms/{roomId}/criteria — LISTAR CRITÉRIOS DA SALA
    // =========================================================================

    @Test
    @DisplayName("GET - Tutor da sala: deve retornar apenas os critérios da sala com 200")
    void getCriteria_TutorDaSala_RetornaListaComStatus200() throws Exception {
        // Arrange (Preparar)
        persistCriterion(room, "Postura", 3.0);
        persistCriterion(room, "Raciocínio Lógico", 5.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("GET - Sem token: deve retornar 401")
    void getCriteria_SemToken_Returns401() throws Exception {
        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + room.getId() + "/criteria"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET - Tutor de OUTRA sala (IDOR): deve retornar 403")
    void getCriteria_TutorDeOutraSala_Returns403() throws Exception {
        // Arrange (Preparar)
        User outroTutor = persistUser("Outro Tutor GET", "outro.tutor.get." + uid() + "@avalia.edu");
        persistRoom("Outra Sala GET", outroTutor);
        persistCriterion(room, "Critério Protegido", 2.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(outroTutor.getId().toString())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET - Aluno membro ativo da sala: deve retornar 403")
    void getCriteria_AlunoMembroAtivo_Returns403() throws Exception {
        // Arrange (Preparar)
        User aluno = persistUser("Aluno GET", "aluno.get." + uid() + "@avalia.edu");
        persistMembro(room, aluno, Role.STUDENT);
        persistCriterion(room, "Critério Visível Só Para Tutor", 1.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(aluno.getId().toString())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET - Sala inexistente: deve retornar 404")
    void getCriteria_SalaInexistente_Returns404() throws Exception {
        // Arrange (Preparar)
        // Nota: falhará até o Leonardo adicionar handler de IllegalStateException → 404.
        String salaInexistenteId = UUID.randomUUID().toString();

        // Act & Assert (Executar e Validar)
        mockMvc.perform(get("/api/v1/rooms/" + salaInexistenteId + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET - Deve retornar somente critérios da sala pedida, sem vazar critérios de outra sala")
    void getCriteria_RetornaApenasCriteriosDaSalaPedida_SemVazamento() throws Exception {
        // Arrange (Preparar)
        User outroTutorB = persistUser("Tutor Sala B", "tutor.b." + uid() + "@avalia.edu");
        Room salaB = persistRoom("Sala B", outroTutorB);

        // Persiste 1 critério na sala principal e 1 na Sala B
        persistCriterion(room, "Critério da Sala A", 2.0);
        persistCriterion(salaB, "Critério da Sala B", 3.0);

        // Act (Executar GET na sala principal como tutor da sala A)
        mockMvc.perform(get("/api/v1/rooms/" + room.getId() + "/criteria")
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isOk())
                // Deve retornar exatamente 1 critério (o da sala A)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].criteriaName").value("Critério da Sala A"))
                // Critério da Sala B não deve aparecer
                .andExpect(jsonPath("$[?(@.criteriaName == 'Critério da Sala B')]").isEmpty());
    }

    // =========================================================================
    // DELETE /api/v1/rooms/{roomId}/criteria/{criterionId} — REMOVER CRITÉRIO
    // =========================================================================

    @Test
    @DisplayName("DELETE - Tutor da sala: deve remover critério do banco com 204")
    void deleteCriterion_TutorDaSala_RemoveCriterioERetorna204() throws Exception {
        // Arrange (Preparar)
        Criterion criterion = persistCriterion(room, "Critério para Deletar", 1.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + room.getId() + "/criteria/" + criterion.getId())
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isNoContent());

        // Assert (Validar remoção no banco)
        assertTrue(criterionRepository.findById(criterion.getId()).isEmpty(),
                "O critério deve ser removido do banco após o DELETE");
    }

    @Test
    @DisplayName("DELETE - Sem token: deve retornar 401 e critério preservado")
    void deleteCriterion_SemToken_Returns401ECriterioPreservado() throws Exception {
        // Arrange (Preparar)
        Criterion criterion = persistCriterion(room, "Critério Protegido", 2.0);

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + room.getId() + "/criteria/" + criterion.getId()))
                .andExpect(status().isUnauthorized());

        // Assert (Validar permanência no banco)
        assertTrue(criterionRepository.findById(criterion.getId()).isPresent(),
                "O critério deve permanecer no banco quando não autenticado");
    }

    @Test
    @DisplayName("DELETE - Tutor de OUTRA sala (IDOR): deve retornar 403 e critério preservado")
    void deleteCriterion_TutorDeOutraSala_Returns403ECriterioPreservado() throws Exception {
        // Arrange (Preparar)
        User outroTutor = persistUser("Outro Tutor DELETE", "outro.tutor.del." + uid() + "@avalia.edu");
        persistRoom("Outra Sala DELETE", outroTutor);
        Criterion criterion = persistCriterion(room, "Critério Intacto IDOR", 2.0);

        // Act (Executar)
        mockMvc.perform(delete("/api/v1/rooms/" + room.getId() + "/criteria/" + criterion.getId())
                        .with(authenticatedAs(outroTutor.getId().toString())))
                .andExpect(status().isForbidden());

        // Assert (Validar permanência no banco)
        assertTrue(criterionRepository.findById(criterion.getId()).isPresent(),
                "O critério deve permanecer no banco quando a exclusão é negada a tutor de outra sala");
    }

    @Test
    @DisplayName("DELETE - Aluno membro ativo da sala: deve retornar 403 e critério preservado")
    void deleteCriterion_AlunoMembro_Returns403ECriterioPreservado() throws Exception {
        // Arrange (Preparar)
        User aluno = persistUser("Aluno DELETE", "aluno.del." + uid() + "@avalia.edu");
        persistMembro(room, aluno, Role.STUDENT);
        Criterion criterion = persistCriterion(room, "Critério Intacto Aluno", 3.0);

        // Act (Executar)
        mockMvc.perform(delete("/api/v1/rooms/" + room.getId() + "/criteria/" + criterion.getId())
                        .with(authenticatedAs(aluno.getId().toString())))
                .andExpect(status().isForbidden());

        // Assert (Validar permanência no banco)
        assertTrue(criterionRepository.findById(criterion.getId()).isPresent(),
                "O critério deve permanecer no banco quando aluno tenta remover");
    }

    @Test
    @DisplayName("DELETE - Sala inexistente: deve retornar 404")
    void deleteCriterion_SalaInexistente_Returns404() throws Exception {
        // Arrange (Preparar)
        // Nota: falhará até o Leonardo adicionar handler de IllegalStateException → 404.
        String salaInexistenteId = UUID.randomUUID().toString();

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + salaInexistenteId + "/criteria/crit-qualquer")
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE - Critério inexistente no banco: deve retornar 400")
    void deleteCriterion_CriterioInexistente_Returns400() throws Exception {
        // Arrange (Preparar)
        String criterioInexistente = UUID.randomUUID().toString();

        // Act & Assert (Executar e Validar)
        mockMvc.perform(delete("/api/v1/rooms/" + room.getId() + "/criteria/" + criterioInexistente)
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Critério não encontrado: " + criterioInexistente));
    }

    @Test
    @DisplayName("DELETE - Critério que pertence a outra sala: deve ser rejeitado com 400 e critério preservado")
    void deleteCriterion_CriterioDeOutraSala_Returns400ECriterioPreservado() throws Exception {
        // Arrange (Preparar)
        User outroTutorC = persistUser("Tutor Sala C", "tutor.c." + uid() + "@avalia.edu");
        Room salaC = persistRoom("Sala C", outroTutorC);
        Criterion criterioSalaC = persistCriterion(salaC, "Critério da Sala C", 1.5);

        // Act (Executar: tutor da sala principal tenta deletar critério da Sala C)
        mockMvc.perform(delete("/api/v1/rooms/" + room.getId() + "/criteria/" + criterioSalaC.getId())
                        .with(authenticatedAs(tutor.getId().toString())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("O critério informado não pertence a esta sala."));

        // Assert (Validar que o critério da Sala C permanece intacto)
        assertTrue(criterionRepository.findById(criterioSalaC.getId()).isPresent(),
                "O critério da Sala C deve permanecer intacto no banco de dados");
    }

    // =========================================================================
    // FORA DE ESCOPO DO CARD /salas/{id}/criterios
    // =========================================================================

    @Test
    @Disabled("Fora do escopo do card /salas/{id}/criterios: edição de critérios (PUT/PATCH)")
    @DisplayName("Contrato futuro: Deve atualizar nome da tabela/critério via PUT persistindo no banco")
    void updateCriterion_PutMethod_ForaDoEscopo() {
        // Contrato esperado: PUT /api/v1/rooms/{roomId}/criteria/{criterionId}
    }

    @Test
    @Disabled("Fora do escopo do card /salas/{id}/criterios: ativação/desativação de critérios (PATCH /status)")
    @DisplayName("Contrato futuro: Deve ativar/desativar critério via PATCH persistindo no banco")
    void toggleCriterionStatus_PatchMethod_ForaDoEscopo() {
        // Contrato esperado: PATCH /api/v1/rooms/{roomId}/criteria/{criterionId}/status
    }
}
