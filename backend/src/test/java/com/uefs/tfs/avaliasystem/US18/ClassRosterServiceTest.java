package com.uefs.tfs.avaliasystem.US18;

import com.uefs.tfs.avaliasystem.dto.ClassRosterDTO;
import com.uefs.tfs.avaliasystem.dto.PageResponse;
import com.uefs.tfs.avaliasystem.model.Role;
import com.uefs.tfs.avaliasystem.model.RoomMember;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.RoomMemberRepository;
import com.uefs.tfs.avaliasystem.repository.RoomRepository;
import com.uefs.tfs.avaliasystem.service.ClassRosterService;
import com.uefs.tfs.avaliasystem.util.PaginationUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Teste unitário da US18 - Camada de Serviço (ClassRosterTest).
 * Cobertura de critérios:
 * - Paginação: DTO mapeado com profileImageUrl e initials sempre preenchido (fallback de avatar)
 * - Isolamento de sala: quem não é tutor da sala recebe AccessDeniedException
 * - Proteção DoS: tamanho de página excessivo é limitado a 100
 * - Data Leak: ClassRosterDTO traz somente id, name, profileImageUrl e initials
 */
@ExtendWith(MockitoExtension.class)
class ClassRosterServiceTest {

    @InjectMocks
    private ClassRosterService service;

    @Mock
    private RoomRepository roomRepository;

    @Mock
    private RoomMemberRepository roomMemberRepository;

    private RoomMember buildMember(String name, String pictureUrl) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setName(name);
        user.setEmail("aluno@uefs.br");
        user.setPassword("hash-secreto");
        user.setProfilePictureUrl(pictureUrl);

        RoomMember member = new RoomMember();
        member.setUser(user);
        member.setRole(Role.STUDENT);
        member.setActive(true);
        return member;
    }

    @Nested
    @DisplayName("[US18] Cenários Válidos")
    class ValidScenarios {

        @Test
        @DisplayName("[US18] Tutor da sala recebe a página do carômetro com foto e iniciais")
        void getRoster_RoomTutor_ReturnsPagedRosterWithInitials() {
            // Dado um tutor dono da sala e uma sala com 2 alunos ativos
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            Pageable pageable = PageRequest.of(0, 10);
            when(roomRepository.existsByIdAndTutorId(roomId, tutorId)).thenReturn(true);
            when(roomMemberRepository.findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(roomId, Role.STUDENT, pageable))
                    .thenReturn(new PageImpl<>(List.of(
                            buildMember("Maria Clara Souza", "https://img.uefs.br/maria.png"),
                            buildMember("João", null)), pageable, 2));

            // Quando o tutor busca o carômetro
            PageResponse<ClassRosterDTO> result = service.getRoster(roomId, tutorId, pageable);

            // Então os alunos vêm mapeados com URL da imagem e iniciais para o fallback
            assertThat(result.content()).hasSize(2);
            assertThat(result.content().get(0).name()).isEqualTo("Maria Clara Souza");
            assertThat(result.content().get(0).profileImageUrl()).isEqualTo("https://img.uefs.br/maria.png");
            assertThat(result.content().get(0).initials()).isEqualTo("MS");
            assertThat(result.content().get(1).profileImageUrl()).as("Sem foto, a URL fica nula").isNull();
            assertThat(result.content().get(1).initials()).as("Mesmo sem foto, as iniciais são obrigatórias").isEqualTo("J");
            assertThat(result.size()).isEqualTo(10);
            assertThat(result.totalElements()).isEqualTo(2);
        }

        @ParameterizedTest(name = "nome = [{0}] -> iniciais = [{1}]")
        @CsvSource(delimiter = '|', value = {
                "Maria Clara Souza|MS",
                "joão|J",
                "'  ana   lima '|AL",
                "Pedro Henrique|PH"
        })
        @DisplayName("[US18] Iniciais são geradas a partir do primeiro e do último nome")
        void getRoster_VariousNames_BuildsInitials(String name, String expectedInitials) {
            // Dado um aluno com o nome informado
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            Pageable pageable = PageRequest.of(0, 10);
            when(roomRepository.existsByIdAndTutorId(roomId, tutorId)).thenReturn(true);
            when(roomMemberRepository.findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(roomId, Role.STUDENT, pageable))
                    .thenReturn(new PageImpl<>(List.of(buildMember(name, null)), pageable, 1));

            // Quando o tutor busca o carômetro
            PageResponse<ClassRosterDTO> result = service.getRoster(roomId, tutorId, pageable);

            // Então as iniciais esperadas são preenchidas
            assertThat(result.content().get(0).initials()).isEqualTo(expectedInitials);
        }

        @Test
        @DisplayName("[US18] Nome ausente usa o fallback '?' para as iniciais")
        void getRoster_NullName_UsesFallbackInitials() {
            // Dado um aluno com nome nulo
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            Pageable pageable = PageRequest.of(0, 10);
            when(roomRepository.existsByIdAndTutorId(roomId, tutorId)).thenReturn(true);
            when(roomMemberRepository.findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(roomId, Role.STUDENT, pageable))
                    .thenReturn(new PageImpl<>(List.of(buildMember(null, null)), pageable, 1));

            // Quando o tutor busca o carômetro
            PageResponse<ClassRosterDTO> result = service.getRoster(roomId, tutorId, pageable);

            // Então o campo initials nunca fica vazio
            assertThat(result.content().get(0).initials()).isEqualTo(ClassRosterDTO.FALLBACK_INITIALS);
        }

        @Test
        @DisplayName("[US18] Sala sem alunos retorna página vazia")
        void getRoster_EmptyRoom_ReturnsEmptyPage() {
            // Dado uma sala sem alunos ativos
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            Pageable pageable = PageRequest.of(0, 10);
            when(roomRepository.existsByIdAndTutorId(roomId, tutorId)).thenReturn(true);
            when(roomMemberRepository.findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(roomId, Role.STUDENT, pageable))
                    .thenReturn(new PageImpl<>(List.of(), pageable, 0));

            // Quando o tutor busca o carômetro
            PageResponse<ClassRosterDTO> result = service.getRoster(roomId, tutorId, pageable);

            // Então a lista vem vazia, sem erro
            assertThat(result.content()).isEmpty();
            assertThat(result.totalElements()).isZero();
        }
    }

    @Nested
    @DisplayName("[US18] Cenários Inválidos (Isolamento de Sala)")
    class InvalidScenarios {

        @Test
        @DisplayName("[US18] Usuário da Sala A tentando acessar o carômetro da Sala B recebe acesso negado")
        void getRoster_UserFromAnotherRoom_ThrowsAccessDenied() {
            // Dado um usuário que não é tutor da Sala B
            UUID roomBId = UUID.randomUUID();
            UUID userFromRoomA = UUID.randomUUID();
            when(roomRepository.existsByIdAndTutorId(roomBId, userFromRoomA)).thenReturn(false);

            // Quando ele tenta acessar o carômetro da Sala B
            AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                    () -> service.getRoster(roomBId, userFromRoomA, PageRequest.of(0, 10)));

            // Então o acesso é negado e nenhum aluno é consultado
            assertThat(ex.getMessage()).contains("Acesso negado");
            verifyNoInteractions(roomMemberRepository);
        }
    }

    @Nested
    @DisplayName("[US18] Proteção contra DoS na Paginação")
    class DosProtection {

        @Test
        @DisplayName("[US18] Tamanho de página excessivo (50000) é limitado ao máximo seguro de 100")
        void safePageable_ExcessiveSize_IsCappedAtMax() {
            // Quando o cliente pede uma página gigante
            Pageable pageable = PaginationUtils.safePageable(0, 50000);

            // Então o backend força o limite máximo
            assertThat(pageable.getPageSize()).isEqualTo(PaginationUtils.MAX_PAGE_SIZE).isEqualTo(100);
        }

        @Test
        @DisplayName("[US18] Parâmetros negativos ou zerados são normalizados")
        void safePageable_InvalidValues_AreNormalized() {
            // Quando o cliente envia página negativa e tamanho zero
            Pageable pageable = PaginationUtils.safePageable(-5, 0);

            // Então a página vai para 0 e o tamanho assume o padrão
            assertThat(pageable.getPageNumber()).isZero();
            assertThat(pageable.getPageSize()).isEqualTo(PaginationUtils.DEFAULT_PAGE_SIZE);
        }

        @Test
        @DisplayName("[US18] Tamanho dentro do limite é preservado")
        void safePageable_ValidSize_IsPreserved() {
            // Quando o cliente pede uma página de 10 itens
            Pageable pageable = PaginationUtils.safePageable(2, 10);

            // Então os valores são mantidos
            assertThat(pageable.getPageNumber()).isEqualTo(2);
            assertThat(pageable.getPageSize()).isEqualTo(10);
        }
    }

    @Nested
    @DisplayName("[US18] Prevenção de Vazamento de Dados")
    class DataLeakPrevention {

        @Test
        @DisplayName("[US18] ClassRosterDTO expõe apenas id, name, profileImageUrl e initials")
        void classRosterDto_ExposesOnlyAllowedFields() {
            // Dado o contrato do DTO do carômetro
            List<String> fields = Arrays.stream(ClassRosterDTO.class.getRecordComponents())
                    .map(RecordComponent::getName)
                    .toList();

            // Então somente os campos permitidos existem
            assertThat(fields)
                    .as("O DTO deve conter somente os campos públicos do carômetro")
                    .containsExactlyInAnyOrder("id", "name", "profileImageUrl", "initials");
            assertThat(fields)
                    .as("O DTO não pode vazar CPF, senha, e-mail ou notas")
                    .doesNotContain("cpf", "password", "email", "grade", "score");
        }

        @Test
        @DisplayName("[US18] Conteúdo mapeado não carrega e-mail nem senha do aluno")
        void mappedDto_DoesNotCarryEmailOrPassword() {
            // Dado um aluno com e-mail e senha cadastrados
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            Pageable pageable = PageRequest.of(0, 10);
            when(roomRepository.existsByIdAndTutorId(roomId, tutorId)).thenReturn(true);
            when(roomMemberRepository.findByRoomIdAndRoleAndActiveTrueOrderByUserNameAsc(eq(roomId), eq(Role.STUDENT), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(buildMember("Maria Clara", null)), pageable, 1));

            // Quando o tutor busca o carômetro
            PageResponse<ClassRosterDTO> result = service.getRoster(roomId, tutorId, pageable);

            // Então a representação textual do DTO não contém dados sensíveis
            assertThat(result.content().get(0).toString())
                    .doesNotContain("aluno@uefs.br")
                    .doesNotContain("hash-secreto");
        }
    }
}