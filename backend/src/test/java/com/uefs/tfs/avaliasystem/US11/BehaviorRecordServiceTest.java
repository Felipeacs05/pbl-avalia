package com.uefs.tfs.avaliasystem.US11;

import com.uefs.tfs.avaliasystem.dto.BehaviorRecordRequest;
import com.uefs.tfs.avaliasystem.dto.BehaviorRecordResponse;
import com.uefs.tfs.avaliasystem.dto.BehaviorTagResponse;
import com.uefs.tfs.avaliasystem.model.BehaviorRecord;
import com.uefs.tfs.avaliasystem.model.BehaviorTag;
import com.uefs.tfs.avaliasystem.model.Problem;
import com.uefs.tfs.avaliasystem.model.Room;
import com.uefs.tfs.avaliasystem.model.TutoringSession;
import com.uefs.tfs.avaliasystem.model.User;
import com.uefs.tfs.avaliasystem.repository.BehaviorRecordRepository;
import com.uefs.tfs.avaliasystem.repository.BehaviorTagRepository;
import com.uefs.tfs.avaliasystem.repository.TutoringSessionRepository;
import com.uefs.tfs.avaliasystem.repository.UserRepository;
import com.uefs.tfs.avaliasystem.service.BehaviorRecordService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;

// Teste unitário puro: repositórios e relógio mockados, sem contexto Spring e sem banco
@ExtendWith(MockitoExtension.class)
@DisplayName("[US11] Service de registro de comportamento")
class BehaviorRecordServiceTest {

    @InjectMocks
    private BehaviorRecordService behaviorRecordService;

    @Mock
    private BehaviorRecordRepository behaviorRecordRepository;

    @Mock
    private BehaviorTagRepository behaviorTagRepository;

    @Mock
    private TutoringSessionRepository tutoringSessionRepository;

    @Mock
    private UserRepository userRepository;

    // O horário vem do bean Clock (ClockConfig): mockado, o teste sabe exatamente qual instante esperar
    @Mock
    private Clock clock;

    @Captor
    private ArgumentCaptor<BehaviorRecord> recordCaptor;

    private final UUID TUTOR_UUID = UUID.fromString("123e4567-e89b-12d3-a456-426614174000");
    private final UUID OTHER_TUTOR_UUID = UUID.fromString("444e4444-e44b-44d4-a444-444444444444");
    private final UUID STUDENT_UUID = UUID.fromString("999e9999-e99b-99d9-a999-999999999999");
    private final UUID ROOM_UUID = UUID.fromString("987e6543-e21b-12d3-a456-426614174000");
    private final UUID PROBLEM_UUID = UUID.fromString("555e5555-e55b-55d5-a555-555555555555");
    private final UUID SESSION_UUID = UUID.fromString("777e7777-e77b-77d7-a777-777777777777");
    private final UUID TAG_UUID = UUID.fromString("888e8888-e88b-88d8-a888-888888888888");
    private final UUID OTHER_TAG_UUID = UUID.fromString("111e1111-e11b-11d1-a111-111111111111");
    private final UUID RECORD_UUID = UUID.fromString("222e2222-e22b-22d2-a222-222222222222");

    private final Instant NOW = Instant.parse("2026-10-12T14:00:00Z");

    private static final String NOT_TUTOR_MESSAGE = "Apenas o tutor responsável pela sala pode registrar comportamentos.";

    private TutoringSession session;
    private User student;
    private BehaviorTag lateTag;

    @BeforeEach
    void setUp() {
        User tutor = new User();
        tutor.setId(TUTOR_UUID);
        tutor.setName("Tutor Responsável");

        Room room = new Room();
        room.setId(ROOM_UUID);
        room.setName("Módulo PBL 1");
        room.setTutor(tutor);

        Problem problem = new Problem();
        problem.setId(PROBLEM_UUID);
        problem.setTitle("Problema 1");
        problem.setRoom(room);

        // A posse é resolvida pelo caminho sessão → problema → sala → tutor (mesmo da US09)
        session = new TutoringSession();
        session.setId(SESSION_UUID);
        session.setProblem(problem);

        student = new User();
        student.setId(STUDENT_UUID);
        student.setName("Aluno Teste");

        lateTag = new BehaviorTag();
        lateTag.setId(TAG_UUID);
        lateTag.setName("Atraso");
    }

    // --- TAGS PREDEFINIDAS ---

    @Test
    @DisplayName("Deve devolver as tags predefinidas com id e nome, na ordem do repositório")
    void listBehaviorTags_ReturnsTagsInRepositoryOrder() {
        BehaviorTag phoneTag = new BehaviorTag();
        phoneTag.setId(OTHER_TAG_UUID);
        phoneTag.setName("Celular fora de contexto");

        Mockito.when(behaviorTagRepository.findAllByOrderByNameAsc()).thenReturn(List.of(lateTag, phoneTag));

        List<BehaviorTagResponse> tags = behaviorRecordService.listBehaviorTags();

        assertEquals(List.of(TAG_UUID, OTHER_TAG_UUID), tags.stream().map(BehaviorTagResponse::getId).toList());
        assertEquals(List.of("Atraso", "Celular fora de contexto"),
                tags.stream().map(BehaviorTagResponse::getName).toList());
    }

    // --- REGISTRO POR TAG ---

    @Test
    @DisplayName("Deve gravar o registro com a tag escolhida, ligado à sessão e ao aluno, com o horário do servidor")
    void createBehaviorRecord_WithTagByRoomTutor_SavesRecordWithServerTimestamp() {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        Mockito.when(userRepository.findById(STUDENT_UUID)).thenReturn(Optional.of(student));
        Mockito.when(behaviorTagRepository.findById(TAG_UUID)).thenReturn(Optional.of(lateTag));
        Mockito.when(clock.instant()).thenReturn(NOW);
        // Simula o banco atribuindo o id: a resposta precisa ser montada a partir do que save devolve
        Mockito.when(behaviorRecordRepository.save(any(BehaviorRecord.class))).thenAnswer(i -> {
            BehaviorRecord saved = i.getArgument(0);
            saved.setId(RECORD_UUID);
            return saved;
        });

        BehaviorRecordResponse response = behaviorRecordService.createBehaviorRecord(
                SESSION_UUID, STUDENT_UUID, new BehaviorRecordRequest(TAG_UUID, null), TUTOR_UUID);

        Mockito.verify(behaviorRecordRepository).save(recordCaptor.capture());
        BehaviorRecord captured = recordCaptor.getValue();
        assertEquals(SESSION_UUID, captured.getSession().getId());
        assertEquals(STUDENT_UUID, captured.getStudent().getId());
        assertEquals(TAG_UUID, captured.getTag().getId());
        assertNull(captured.getText());
        assertEquals(NOW, captured.getRecordedAt());

        assertEquals(RECORD_UUID, response.getId());
        assertEquals(SESSION_UUID, response.getSessionId());
        assertEquals(STUDENT_UUID, response.getStudentId());
        assertEquals(TAG_UUID, response.getTagId());
        // Nome do aluno e da tag não vêm no payload: prova que a resposta foi montada a partir das entidades
        assertEquals("Aluno Teste", response.getStudentName());
        assertEquals("Atraso", response.getTagName());
        assertNull(response.getText());
        assertEquals(NOW, response.getRecordedAt());
    }

    @Test
    @DisplayName("Deve criar um registro novo a cada toque, mesmo com a mesma tag para o mesmo aluno")
    void createBehaviorRecord_SameTagTwice_SavesTwoDistinctRecords() {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        Mockito.when(userRepository.findById(STUDENT_UUID)).thenReturn(Optional.of(student));
        Mockito.when(behaviorTagRepository.findById(TAG_UUID)).thenReturn(Optional.of(lateTag));
        Mockito.when(clock.instant()).thenReturn(NOW);
        Mockito.when(behaviorRecordRepository.save(any(BehaviorRecord.class))).thenAnswer(i -> i.getArgument(0));

        BehaviorRecordRequest request = new BehaviorRecordRequest(TAG_UUID, null);
        behaviorRecordService.createBehaviorRecord(SESSION_UUID, STUDENT_UUID, request, TUTOR_UUID);
        behaviorRecordService.createBehaviorRecord(SESSION_UUID, STUDENT_UUID, request, TUTOR_UUID);

        Mockito.verify(behaviorRecordRepository, Mockito.times(2)).save(recordCaptor.capture());
        List<BehaviorRecord> saved = recordCaptor.getAllValues();
        // Duas entidades novas: nenhuma busca por registro anterior para reaproveitar
        assertNotSame(saved.get(0), saved.get(1));
        assertNull(saved.get(0).getId());
        assertNull(saved.get(1).getId());
        Mockito.verifyNoMoreInteractions(behaviorRecordRepository);
    }

    // --- REGISTRO POR TEXTO LIVRE ---

    @Test
    @DisplayName("Deve gravar o texto livre sem tag e sem consultar as tags")
    void createBehaviorRecord_WithTextOnly_SavesTextWithoutTag() {
        String text = "Interrompeu o colega duas vezes durante a discussão.";

        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));
        Mockito.when(userRepository.findById(STUDENT_UUID)).thenReturn(Optional.of(student));
        Mockito.when(clock.instant()).thenReturn(NOW);
        Mockito.when(behaviorRecordRepository.save(any(BehaviorRecord.class))).thenAnswer(i -> {
            BehaviorRecord saved = i.getArgument(0);
            saved.setId(RECORD_UUID);
            return saved;
        });

        BehaviorRecordResponse response = behaviorRecordService.createBehaviorRecord(
                SESSION_UUID, STUDENT_UUID, new BehaviorRecordRequest(null, text), TUTOR_UUID);

        Mockito.verify(behaviorRecordRepository).save(recordCaptor.capture());
        BehaviorRecord captured = recordCaptor.getValue();
        assertEquals(text, captured.getText());
        assertNull(captured.getTag());
        assertEquals(SESSION_UUID, captured.getSession().getId());
        assertEquals(STUDENT_UUID, captured.getStudent().getId());
        assertEquals(NOW, captured.getRecordedAt());

        assertEquals(RECORD_UUID, response.getId());
        assertEquals(text, response.getText());
        assertNull(response.getTagId());
        assertNull(response.getTagName());
        Mockito.verifyNoInteractions(behaviorTagRepository);
    }

    // --- RECUSAS ---

    @Test
    @DisplayName("Deve lançar SecurityException e não gravar nada quando o usuário é tutor de outra sala")
    void createBehaviorRecord_ByTutorOfAnotherRoom_ThrowsSecurityException() {
        Mockito.when(tutoringSessionRepository.findById(SESSION_UUID)).thenReturn(Optional.of(session));

        SecurityException ex = assertThrows(SecurityException.class,
                () -> behaviorRecordService.createBehaviorRecord(
                        SESSION_UUID, STUDENT_UUID, new BehaviorRecordRequest(TAG_UUID, null), OTHER_TUTOR_UUID));

        assertEquals(NOT_TUTOR_MESSAGE, ex.getMessage());
        // A posse é verificada antes de qualquer leitura de aluno ou tag e de qualquer escrita
        Mockito.verifyNoInteractions(behaviorRecordRepository, behaviorTagRepository, userRepository);
    }
}
