package com.uefs.tfs.avaliasystem.US18;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.ClassRosterController;
import com.uefs.tfs.avaliasystem.dto.ClassRosterDTO;
import com.uefs.tfs.avaliasystem.dto.PageResponse;
import com.uefs.tfs.avaliasystem.security.RoomSecurity;
import com.uefs.tfs.avaliasystem.service.ClassRosterService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobertura de Critérios da US18 na camada Controller (ClassRosterTest):
 * - 200 OK com paginação (?page=0&size=10) e DTO com profileImageUrl + initials
 * - 403 Forbidden quando o usuário não é tutor da sala acessada (isolamento de sala)
 * - Proteção DoS: ?size=50000 chega ao serviço limitado a 100
 * - Data Leak: o JSON traz somente id, name, profileImageUrl e initials
 */
@WebMvcTest(ClassRosterController.class)
@Import(SecurityConfig.class)
@TestConfig
class ClassRosterControllerTest {

    private static final String URL = "/api/v1/rooms/{roomId}/roster";

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private ClassRosterService service;

    @MockitoBean(name = "roomSecurity")
    private RoomSecurity roomSecurity;

    private ClassRosterDTO sampleDto() {
        return new ClassRosterDTO(UUID.randomUUID(), "Maria Clara Souza", "https://img.uefs.br/maria.png", "MS");
    }

    private PageResponse<ClassRosterDTO> pageOf(int size, ClassRosterDTO... items) {
        return new PageResponse<>(List.of(items), 0, size, items.length, items.length == 0 ? 0 : 1);
    }

    @Nested
    @DisplayName("[US18] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US18] Tutor acessa o carômetro paginado e recebe 200 com imagem e iniciais")
        void getRoster_TutorWithPagination_Returns200WithInitials() throws Exception {
            // Dado um tutor dono da sala e um serviço que devolve a página do carômetro
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(service.getRoster(eq(roomId), eq(tutorId), any(Pageable.class))).thenReturn(pageOf(10, sampleDto()));

            // Quando ele acessa a primeira página com 10 itens
            mockMvc.perform(get(URL, roomId)
                            .param("page", "0")
                            .param("size", "10")
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    // Então recebe 200 com nome, URL da imagem e iniciais para o fallback
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].name").value("Maria Clara Souza"))
                    .andExpect(jsonPath("$.content[0].profileImageUrl").value("https://img.uefs.br/maria.png"))
                    .andExpect(jsonPath("$.content[0].initials").value("MS"))
                    .andExpect(jsonPath("$.size").value(10));

            // E o serviço recebe a paginação solicitada
            ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
            verify(service, times(1)).getRoster(eq(roomId), eq(tutorId), captor.capture());
            assertThat(captor.getValue().getPageNumber()).isZero();
            assertThat(captor.getValue().getPageSize()).isEqualTo(10);
        }

        @Test
        @DisplayName("[US18] Sem parâmetros de paginação usa os valores padrão (página 0, tamanho 20)")
        void getRoster_WithoutPaginationParams_UsesDefaults() throws Exception {
            // Dado um tutor dono da sala
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(service.getRoster(eq(roomId), eq(tutorId), any(Pageable.class))).thenReturn(pageOf(20));

            // Quando ele acessa o endpoint sem paginação
            mockMvc.perform(get(URL, roomId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk());

            // Então os valores padrão são aplicados
            ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
            verify(service).getRoster(eq(roomId), eq(tutorId), captor.capture());
            assertThat(captor.getValue().getPageNumber()).isZero();
            assertThat(captor.getValue().getPageSize()).isEqualTo(20);
        }
    }

    @Nested
    @DisplayName("[US18] Cenários Inválidos")
    class InvalidScenarios {

        @Test
        @DisplayName("[US18] Usuário da Sala A acessando o carômetro da Sala B recebe 403")
        void getRoster_UserFromAnotherRoom_Returns403AndNeverCallsService() throws Exception {
            // Dado um usuário da Sala A e a regra de segurança negando acesso à Sala B
            UUID roomBId = UUID.randomUUID();
            UUID userFromRoomA = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomBId), any(Authentication.class))).thenReturn(false);

            // Quando ele tenta acessar o carômetro da Sala B
            mockMvc.perform(get(URL, roomBId)
                            .with(jwt().jwt(j -> j.subject(userFromRoomA.toString()))))
                    // Então recebe 403 Forbidden
                    .andExpect(status().isForbidden());

            verify(service, never()).getRoster(any(), any(), any());
        }

        @Test
        @DisplayName("[US18] Requisição sem token JWT retorna 401 e o serviço nunca é chamado")
        void getRoster_NoToken_Returns401() throws Exception {
            // Quando a requisição chega sem autenticação
            mockMvc.perform(get(URL, UUID.randomUUID()))
                    // Então a cadeia de segurança barra com 401
                    .andExpect(status().isUnauthorized());

            verify(service, never()).getRoster(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("[US18] Proteção contra DoS")
    class DosProtection {

        @Test
        @DisplayName("[US18] ?size=50000 é limitado a 100 antes de chegar ao serviço")
        void getRoster_ExcessiveSize_IsCappedAt100() throws Exception {
            // Dado um tutor dono da sala
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(service.getRoster(eq(roomId), eq(tutorId), any(Pageable.class))).thenReturn(pageOf(100));

            // Quando ele pede uma página absurdamente grande
            mockMvc.perform(get(URL, roomId)
                            .param("page", "0")
                            .param("size", "50000")
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk());

            // Então o serviço recebe no máximo 100 itens por página
            ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
            verify(service).getRoster(eq(roomId), eq(tutorId), captor.capture());
            assertThat(captor.getValue().getPageSize()).as("O tamanho deve ser limitado a 100").isEqualTo(100);
        }
    }

    @Nested
    @DisplayName("[US18] Prevenção de Vazamento de Dados")
    class DataLeakPrevention {

        @Test
        @DisplayName("[US18] JSON do carômetro traz apenas id, name, profileImageUrl e initials")
        void getRoster_Response_DoesNotLeakSensitiveFields() throws Exception {
            // Dado um tutor dono da sala
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(service.getRoster(eq(roomId), eq(tutorId), any(Pageable.class))).thenReturn(pageOf(10, sampleDto()));

            // Quando ele busca o carômetro
            String body = mockMvc.perform(get(URL, roomId)
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk())
                    // Então nenhum campo sensível existe no item
                    .andExpect(jsonPath("$.content[0].cpf").doesNotExist())
                    .andExpect(jsonPath("$.content[0].password").doesNotExist())
                    .andExpect(jsonPath("$.content[0].email").doesNotExist())
                    .andExpect(jsonPath("$.content[0].grade").doesNotExist())
                    .andExpect(jsonPath("$.content[0].score").doesNotExist())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

            // E o conjunto de chaves do item é exatamente o contrato público
            JsonNode item = objectMapper.readTree(body).get("content").get(0);
            Set<String> keys = new HashSet<>();
            item.fieldNames().forEachRemaining(keys::add);
            assertThat(keys).containsExactlyInAnyOrder("id", "name", "profileImageUrl", "initials");
        }
    }
}