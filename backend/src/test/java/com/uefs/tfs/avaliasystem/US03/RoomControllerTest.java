package com.uefs.tfs.avaliasystem.US03;

import tools.jackson.databind.ObjectMapper;
import com.uefs.tfs.avaliasystem.controller.RoomController;
import com.uefs.tfs.avaliasystem.dto.RoomRequest;
import com.uefs.tfs.avaliasystem.dto.RoomResponse;
import com.uefs.tfs.avaliasystem.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Inicializa apenas a Camada 1 (rotas, serialização JSON e filtros HTTP).
// Não inicia o banco de dados.
@WebMvcTest(RoomController.class)
class RoomControllerTest {

    // Ferramenta que simula requisições web (GET, POST, etc.) na nossa API
    @Autowired
    private MockMvc mockMvc;

    // Transforma nossos objetos Java em texto JSON e vice-versa
    @Autowired
    private ObjectMapper objectMapper;

    // Falsifica a camada de regras de negócio, focando o teste apenas nas rotas
    @MockitoBean
    private RoomService roomService;

    private Principal mockPrincipal;

    private final String TUTOR_UUID = "123e4567-e89b-12d3-a456-426614174000";
    private final String ROOM_UUID = "987e6543-e21b-12d3-a456-426614174000";

    // Mimetiza a existência de um usuário autenticado (como um token JWT)
    @BeforeEach
    void setUp() {
        mockPrincipal = Mockito.mock(Principal.class);
        Mockito.when(mockPrincipal.getName()).thenReturn(TUTOR_UUID);
    }

    // --- TESTES DE CRIAÇÃO (POST) ---

    @Test
    @DisplayName("Deve desserializar o JSON, validar o DTO (apenas nome) e encaminhar ao Service")
    void createRoom_WithAllValidAttributes_ForwardsToService() throws Exception {
        RoomRequest request = new RoomRequest("Módulo de Engenharia de Software");
        RoomResponse expectedResponse = new RoomResponse("A1B2C", "app/join/A1B2C");

        // Ensina o mock a retornar a resposta formatada
        Mockito.when(roomService.createRoom(any(RoomRequest.class), eq(TUTOR_UUID)))
               .thenReturn(expectedResponse);

        // Dispara uma chamada simulada (POST /api/v1/rooms)
        mockMvc.perform(post("/api/v1/rooms")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated()) // Espera código 201 (Sucesso na criação)
                .andExpect(jsonPath("$.code").value("A1B2C"))
                .andExpect(jsonPath("$.joinLink").value("app/join/A1B2C"));

        // Confirma que a porta de entrada enviou os dados corretos para o domínio (Service)
        verify(roomService, Mockito.times(1)).createRoom(any(RoomRequest.class), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("Deve validar o DTO e bloquear a criação se o Nome da Sala for nulo ou vazio")
    void createRoom_WithEmptyName_Returns400() throws Exception {
        RoomRequest request = new RoomRequest("");

        mockMvc.perform(post("/api/v1/rooms")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest()); // O Controller atua como filtro e barra a entrada

        // O Service nunca deve ser acionado para processar lixo
        verify(roomService, never()).createRoom(any(), any());
    }

    @Test
    @DisplayName("[US03] Deve validar o DTO e retornar 400 ao tentar criar sala com menos de 3 caracteres")
    void createRoom_WithNameLessThan3Characters_Returns400() throws Exception {
        RoomRequest request = new RoomRequest("AB");

        mockMvc.perform(post("/api/v1/rooms")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest()); // Limite inferior da regra "entre 3 e 100 caracteres"

        verify(roomService, never()).createRoom(any(), any());
    }

    @Test
    @DisplayName("[US03] Deve validar o DTO e retornar 400 ao tentar criar sala com mais de 100 caracteres")
    void createRoom_WithNameMoreThan100Characters_Returns400() throws Exception {
        String longName = "A".repeat(101);
        RoomRequest request = new RoomRequest(longName);

        mockMvc.perform(post("/api/v1/rooms")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest()); // Limite superior da mesma regra

        verify(roomService, never()).createRoom(any(), any());
    }

    // --- TESTES DE EDIÇÃO (PUT) ---

    @Test
    @DisplayName("Deve receber requisição PUT, validar os dados e encaminhar edição para o Service")
    void updateRoom_WithValidData_ForwardsToService() throws Exception {
        RoomRequest updateRequest = new RoomRequest("Módulo Atualizado");
        RoomResponse expectedResponse = new RoomResponse("A1B2C", "app/join/A1B2C");

        // Ensina o mock a devolver a mesma sala, já com o novo estado
        Mockito.when(roomService.updateRoom(eq(ROOM_UUID), any(RoomRequest.class), eq(TUTOR_UUID)))
               .thenReturn(expectedResponse);

        // Dispara uma chamada simulada na rota dinâmica com variável de ID
        mockMvc.perform(put("/api/v1/rooms/{id}", ROOM_UUID)
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk()) // Espera 200 (OK) para edições
                .andExpect(jsonPath("$.joinLink").value("app/join/A1B2C"));

        verify(roomService, Mockito.times(1)).updateRoom(eq(ROOM_UUID), any(RoomRequest.class), eq(TUTOR_UUID));
    }

    @Test
    @DisplayName("Deve bloquear edição (PUT) se o Nome da Sala for inválido")
    void updateRoom_WithInvalidName_Returns400() throws Exception {
        RoomRequest updateRequest = new RoomRequest("AB"); // Menos de 3 caracteres

        mockMvc.perform(put("/api/v1/rooms/{id}", ROOM_UUID)
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isBadRequest()); // A validação vale para edição, não só para criação

        verify(roomService, never()).updateRoom(any(), any(), any());
    }

    // --- TESTES DE EXCLUSÃO (DELETE) ---

    @Test
    @DisplayName("Deve receber requisição DELETE e encaminhar exclusão para o Service")
    void deleteRoom_WithValidId_ForwardsToService() throws Exception {
        mockMvc.perform(delete("/api/v1/rooms/{id}", ROOM_UUID)
                .principal(mockPrincipal))
                .andExpect(status().isNoContent()); // Espera-se 204 No Content para exclusões com sucesso

        verify(roomService, Mockito.times(1)).deleteRoom(eq(ROOM_UUID), eq(TUTOR_UUID));
    }
}
