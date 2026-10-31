package com.uefs.tfs.avaliasystem.US18;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Teste de Integração Real da US18 com H2:
 * - Persiste entidades reais (tutores, salas A e B, alunos, membros)
 * - Dispara MockMvc com JWT real, passando por Security (@PreAuthorize), Controller, Service e JPA
 * - Comprova paginação, isolamento entre salas, limite máximo de página e ausência de vazamento de dados
 */
@SpringBootTest
@TestConfig
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@Transactional
class ClassRosterIntegrationTest {

    private static final String URL = "/api/v1/rooms/{roomId}/roster";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private RoomRepository roomRepository;
    @Autowired private RoomMemberRepository roomMemberRepository;
    @Autowired private EntityManager entityManager;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private User tutorA;
    private User tutorB;
    private Room roomA;
    private Room roomB;

    @BeforeEach
    void setUp() {
        // Dado dois tutores, cada um dono de uma sala diferente
        tutorA = persistUser("Tutor A", "tutorA.us18." + UUID.randomUUID() + "@uefs.br", null);
        tutorB = persistUser("Tutor B", "tutorB.us18." + UUID.randomUUID() + "@uefs.br", null);
        roomA = persistRoom("Sala A", tutorA);
        roomB = persistRoom("Sala B", tutorB);
    }

    private User persistUser(String name, String email, String pictureUrl) {
        User user = new User(name, email, "password123", pictureUrl);
        return userRepository.save(user);
    }

    private Room persistRoom(String name, User roomTutor) {
        Room room = new Room();
        room.setName(name);
        room.setAccessCode("US18-" + UUID.randomUUID().toString().substring(0, 6));
        room.setTutor(roomTutor);
        return roomRepository.save(room);
    }

    private RoomMember persistMember(Room room, User user, Role role, boolean active) {
        RoomMember member = new RoomMember();
        member.setRoom(room);
        member.setUser(user);
        member.setRole(role);
        member.setActive(active);
        return roomMemberRepository.save(member);
    }

    private void persistStudents(Room room, int count) {
        for (int i = 0; i < count; i++) {
            // Nomes com zero à esquerda garantem a ordem alfabética previsível
            String name = String.format("Aluno %03d", i);
            User student = persistUser(name, "aluno" + i + "." + UUID.randomUUID() + "@uefs.br",
                    "https://img.uefs.br/aluno" + i + ".png");
            persistMember(room, student, Role.STUDENT, true);
        }
    }

    @Nested
    @DisplayName("[US18] Cenários Válidos de Integração")
    class ValidScenarios {

        @Test
        @DisplayName("[US18] Carômetro paginado (?page=0&size=10) retorna 10 alunos e metadados corretos")
        void getRoster_FirstPage_Returns10StudentsWithMetadata() throws Exception {
            // Dado uma sala com 15 alunos ativos
            persistStudents(roomA, 15);
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor acessa a primeira página com 10 itens
            mockMvc.perform(get(URL, roomA.getId())
                            .param("page", "0")
                            .param("size", "10")
                            .with(jwt().jwt(j -> j.subject(tutorA.getId().toString()))))
                    // Então recebe 200 com 10 alunos, total 15 e 2 páginas
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(10))
                    .andExpect(jsonPath("$.totalElements").value(15))
                    .andExpect(jsonPath("$.totalPages").value(2))
                    .andExpect(jsonPath("$.content[0].name").value("Aluno 000"))
                    .andExpect(jsonPath("$.content[0].initials").value("A0"));
        }

        @Test
        @DisplayName("[US18] Segunda página traz os alunos restantes")
        void getRoster_SecondPage_ReturnsRemainingStudents() throws Exception {
            // Dado uma sala com 15 alunos ativos
            persistStudents(roomA, 15);
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor acessa a segunda página
            mockMvc.perform(get(URL, roomA.getId())
                            .param("page", "1")
                            .param("size", "10")
                            .with(jwt().jwt(j -> j.subject(tutorA.getId().toString()))))
                    // Então recebe os 5 alunos restantes
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(5))
                    .andExpect(jsonPath("$.page").value(1));
        }

        @Test
        @DisplayName("[US18] Aluno sem foto vem com URL nula e iniciais preenchidas para o fallback")
        void getRoster_StudentWithoutPhoto_ReturnsNullUrlAndInitials() throws Exception {
            // Dado um aluno sem foto de perfil
            User student = persistUser("Maria Clara Souza", "maria." + UUID.randomUUID() + "@uefs.br", null);
            persistMember(roomA, student, Role.STUDENT, true);
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor busca o carômetro
            mockMvc.perform(get(URL, roomA.getId())
                            .with(jwt().jwt(j -> j.subject(tutorA.getId().toString()))))
                    // Então a URL é nula, mas as iniciais permitem o avatar padrão
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].profileImageUrl").doesNotExist())
                    .andExpect(jsonPath("$.content[0].initials").value("MS"));
        }

        @Test
        @DisplayName("[US18] Alunos inativos e o tutor não aparecem no carômetro")
        void getRoster_InactiveStudentsAndTutor_AreExcluded() throws Exception {
            // Dado um aluno ativo, um aluno inativo e o tutor como membro da sala
            User active = persistUser("Aluno Ativo", "ativo." + UUID.randomUUID() + "@uefs.br", null);
            User inactive = persistUser("Aluno Inativo", "inativo." + UUID.randomUUID() + "@uefs.br", null);
            persistMember(roomA, active, Role.STUDENT, true);
            persistMember(roomA, inactive, Role.STUDENT, false);
            persistMember(roomA, tutorA, Role.TUTOR, true);
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor busca o carômetro
            mockMvc.perform(get(URL, roomA.getId())
                            .with(jwt().jwt(j -> j.subject(tutorA.getId().toString()))))
                    // Então apenas o aluno ativo é listado
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1))
                    .andExpect(jsonPath("$.content[0].name").value("Aluno Ativo"));
        }
    }

    @Nested
    @DisplayName("[US18] Cenários Inválidos de Integração (Isolamento de Sala)")
    class InvalidScenarios {

        @Test
        @DisplayName("[US18] Tutor da Sala B tentando acessar o carômetro da Sala A recebe 403")
        void getRoster_TutorFromAnotherRoom_Returns403() throws Exception {
            // Dado uma sala A com alunos
            persistStudents(roomA, 3);
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor da Sala B tenta acessar o carômetro da Sala A
            mockMvc.perform(get(URL, roomA.getId())
                            .with(jwt().jwt(j -> j.subject(tutorB.getId().toString()))))
                    // Então o acesso é negado
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US18] Aluno da sala tentando acessar o carômetro recebe 403")
        void getRoster_StudentOfRoom_Returns403() throws Exception {
            // Dado um aluno ativo da Sala A
            User student = persistUser("Aluno Curioso", "curioso." + UUID.randomUUID() + "@uefs.br", null);
            persistMember(roomA, student, Role.STUDENT, true);
            entityManager.flush();
            entityManager.clear();

            // Quando ele tenta acessar o carômetro (exclusivo do tutor)
            mockMvc.perform(get(URL, roomA.getId())
                            .with(jwt().jwt(j -> j.subject(student.getId().toString()))))
                    // Então o acesso é negado
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US18] Sala inexistente retorna 403 sem revelar a existência da sala")
        void getRoster_NonExistentRoom_Returns403() throws Exception {
            // Quando o tutor acessa o carômetro de uma sala que não existe
            mockMvc.perform(get(URL, UUID.randomUUID())
                            .with(jwt().jwt(j -> j.subject(tutorA.getId().toString()))))
                    // Então o acesso é negado
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("[US18] Requisição sem token JWT retorna 401")
        void getRoster_NoToken_Returns401() throws Exception {
            // Quando a requisição chega sem autenticação
            mockMvc.perform(get(URL, roomA.getId()))
                    // Então é barrada antes de qualquer regra de negócio
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("[US18] Proteção contra DoS (Integração)")
    class DosProtection {

        @Test
        @DisplayName("[US18] ?size=50000 é limitado a 100 itens por página")
        void getRoster_ExcessiveSize_IsCappedAt100() throws Exception {
            // Dado uma sala com 105 alunos ativos
            persistStudents(roomA, 105);
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor pede uma página de 50000 itens
            mockMvc.perform(get(URL, roomA.getId())
                            .param("page", "0")
                            .param("size", "50000")
                            .with(jwt().jwt(j -> j.subject(tutorA.getId().toString()))))
                    // Então o backend entrega no máximo 100 itens e indica a segunda página
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.size").value(100))
                    .andExpect(jsonPath("$.content.length()").value(100))
                    .andExpect(jsonPath("$.totalElements").value(105))
                    .andExpect(jsonPath("$.totalPages").value(2));
        }
    }

    @Nested
    @DisplayName("[US18] Prevenção de Vazamento de Dados (Integração)")
    class DataLeakPrevention {

        @Test
        @DisplayName("[US18] Resposta real traz apenas id, name, profileImageUrl e initials")
        void getRoster_Response_DoesNotLeakSensitiveData() throws Exception {
            // Dado uma sala com um aluno que possui e-mail e senha cadastrados
            User student = persistUser("Maria Clara Souza", "maria.leak." + UUID.randomUUID() + "@uefs.br",
                    "https://img.uefs.br/maria.png");
            persistMember(roomA, student, Role.STUDENT, true);
            entityManager.flush();
            entityManager.clear();

            // Quando o tutor busca o carômetro
            String body = mockMvc.perform(get(URL, roomA.getId())
                            .with(jwt().jwt(j -> j.subject(tutorA.getId().toString()))))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

            // Então o corpo não contém e-mail nem senha
            assertThat(body)
                    .doesNotContain(student.getEmail())
                    .doesNotContain("password123");

            // E as chaves do item são exatamente o contrato público
            JsonNode item = objectMapper.readTree(body).get("content").get(0);
            Set<String> keys = new HashSet<>();
            item.fieldNames().forEachRemaining(keys::add);
            assertThat(keys).containsExactlyInAnyOrder("id", "name", "profileImageUrl", "initials");
        }
    }
}
