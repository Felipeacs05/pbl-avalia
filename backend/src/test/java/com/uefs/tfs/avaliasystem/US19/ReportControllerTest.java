package com.uefs.tfs.avaliasystem.US19;

import com.uefs.tfs.avaliasystem.TestConfig;
import com.uefs.tfs.avaliasystem.config.SecurityConfig;
import com.uefs.tfs.avaliasystem.controller.ReportController;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.ProblemSummary;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.StudentReportRow;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.WithdrawnStudentRow;
import com.uefs.tfs.avaliasystem.exception.ExportInProgressException;
import com.uefs.tfs.avaliasystem.exception.ResourceNotFoundException;
import com.uefs.tfs.avaliasystem.model.ExportFormat;
import com.uefs.tfs.avaliasystem.security.RoomSecurity;
import com.uefs.tfs.avaliasystem.service.ClassReportService;
import com.uefs.tfs.avaliasystem.service.ExportedFile;
import com.uefs.tfs.avaliasystem.service.ReportExportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportController.class)
@Import(SecurityConfig.class)
@TestConfig
class ReportControllerTest {

    private static final String FINAL_URL = "/api/v1/rooms/{roomId}/reports/final";
    private static final String EXPORT_URL = "/api/v1/rooms/{roomId}/reports/export";
    private static final String EXPORT_PARTIAL_URL = "/api/v1/rooms/{roomId}/problems/{problemId}/export";
    private static final String IN_PROGRESS_MESSAGE =
            "Relatório em processamento. Aguarde a conclusão antes de solicitar novamente.";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClassReportService classReportService;

    @MockitoBean
    private ReportExportService reportExportService;

    @MockitoBean(name = "roomSecurity")
    private RoomSecurity roomSecurity;

    private ClassReportResponse sampleReport(UUID roomId) {
        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        StudentReportRow row = new StudentReportRow(UUID.randomUUID(), "Aluno A",
                Map.of(p1, 8.0, p2, 6.0), 6.8, List.of());
        WithdrawnStudentRow withdrawnRow = new WithdrawnStudentRow(UUID.randomUUID(), "Ex-Aluno",
                Instant.now(), Map.of(p1, 2.0), 2.0);

        return new ClassReportResponse(roomId, "Módulo PBL 1",
                List.of(new ProblemSummary(p1, "Problema 1", 2.0), new ProblemSummary(p2, "Problema 2", 3.0)),
                List.of(row), List.of(), List.of(withdrawnRow), List.of());
    }

    @Nested
    @DisplayName("[US20] Relatório final em JSON")
    class FinalReportScenarios {

        @Test
        @DisplayName("[US20] Tutor dono da sala recebe 200 com problemas, notas, média ponderada e alunos desistentes")
        void getFinalReport_RoomOwner_Returns200WithWeightedAverage() throws Exception {
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(classReportService.generateClassReport(roomId, tutorId)).thenReturn(sampleReport(roomId));

            mockMvc.perform(get(FINAL_URL, roomId).with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.problems.length()").value(2))
                    .andExpect(jsonPath("$.problems[0].title").value("Problema 1"))
                    .andExpect(jsonPath("$.students[0].studentName").value("Aluno A"))
                    .andExpect(jsonPath("$.students[0].weightedAverage").value(6.8))
                    .andExpect(jsonPath("$.withdrawnStudents[0].studentName").value("Ex-Aluno"))
                    .andExpect(jsonPath("$.withdrawnStudents[0].partialAverage").value(2.0));

            verify(classReportService, times(1)).generateClassReport(roomId, tutorId);
        }

        @Test
        @DisplayName("[US20] Usuário que não é dono da sala recebe 403 e o serviço nunca é chamado")
        void getFinalReport_NotRoomOwner_Returns403AndNeverCallsService() throws Exception {
            UUID roomId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(false);

            mockMvc.perform(get(FINAL_URL, roomId).with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString()))))
                    .andExpect(status().isForbidden());

            verify(classReportService, never()).generateClassReport(any(), any());
        }

        @Test
        @DisplayName("[US20] Requisição sem token JWT retorna 401")
        void getFinalReport_NoToken_Returns401() throws Exception {
            mockMvc.perform(get(FINAL_URL, UUID.randomUUID()))
                    .andExpect(status().isUnauthorized());

            verify(classReportService, never()).generateClassReport(any(), any());
        }

        @Test
        @DisplayName("[US20] Sala inexistente retorna 404 com mensagem em português")
        void getFinalReport_NonExistentRoom_Returns404() throws Exception {
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(classReportService.generateClassReport(roomId, tutorId))
                    .thenThrow(new ResourceNotFoundException("Sala não encontrada"));

            mockMvc.perform(get(FINAL_URL, roomId).with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Sala não encontrada"));
        }
    }

    @Nested
    @DisplayName("[US19] Exportação e download")
    class ExportScenarios {

        @Test
        @DisplayName("[US19] Exportação parcial (por problema isolado) em PDF devolve o arquivo com tipo application/pdf")
        void exportPartial_Pdf_Returns200AsAttachment() throws Exception {
            UUID roomId = UUID.randomUUID();
            UUID problemId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            byte[] pdf = "%PDF-1.7 partial".getBytes();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(reportExportService.exportProblem(roomId, problemId, tutorId, ExportFormat.PDF))
                    .thenReturn(new ExportedFile("relatorio-parcial.pdf", "application/pdf", pdf));

            mockMvc.perform(get(EXPORT_PARTIAL_URL, roomId, problemId).param("format", "PDF")
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", containsString("application/pdf")))
                    .andExpect(header().string("Content-Disposition", containsString("attachment")))
                    .andExpect(header().string("Content-Disposition", containsString("relatorio-parcial.pdf")))
                    .andExpect(content().bytes(pdf));
        }

        @Test
        @DisplayName("[US19] Exportação em PDF devolve o arquivo como anexo com tipo application/pdf")
        void export_Pdf_Returns200AsAttachment() throws Exception {
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            byte[] pdf = "%PDF-1.7 conteudo".getBytes();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(reportExportService.export(roomId, tutorId, ExportFormat.PDF))
                    .thenReturn(new ExportedFile("relatorio-final.pdf", "application/pdf", pdf));

            mockMvc.perform(get(EXPORT_URL, roomId).param("format", "PDF")
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", containsString("application/pdf")))
                    .andExpect(header().string("Content-Disposition", containsString("attachment")))
                    .andExpect(header().string("Content-Disposition", containsString("relatorio-final.pdf")))
                    .andExpect(content().bytes(pdf));
        }

        @Test
        @DisplayName("[US19] Exportação em planilha devolve o arquivo XLSX como anexo")
        void export_Xlsx_Returns200AsAttachment() throws Exception {
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            byte[] xlsx = "PK-planilha".getBytes();
            String xlsxType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(reportExportService.export(roomId, tutorId, ExportFormat.XLSX))
                    .thenReturn(new ExportedFile("relatorio-final.xlsx", xlsxType, xlsx));

            mockMvc.perform(get(EXPORT_URL, roomId).param("format", "xlsx")
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", containsString(xlsxType)))
                    .andExpect(header().string("Content-Disposition", containsString("relatorio-final.xlsx")))
                    .andExpect(content().bytes(xlsx));
        }

        @Test
        @DisplayName("[US19] Clique durante o processamento retorna 409 com a mensagem de processamento")
        void export_WhileProcessing_Returns409WithProcessingMessage() throws Exception {
            UUID roomId = UUID.randomUUID();
            UUID tutorId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);
            when(reportExportService.export(roomId, tutorId, ExportFormat.PDF))
                    .thenThrow(new ExportInProgressException(IN_PROGRESS_MESSAGE));

            mockMvc.perform(get(EXPORT_URL, roomId).param("format", "PDF")
                            .with(jwt().jwt(j -> j.subject(tutorId.toString()))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.message").value(IN_PROGRESS_MESSAGE));
        }

        @Test
        @DisplayName("[US19] Formato inválido retorna 400 e o serviço nunca é chamado")
        void export_InvalidFormat_Returns400AndNeverCallsService() throws Exception {
            UUID roomId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(true);

            mockMvc.perform(get(EXPORT_URL, roomId).param("format", "DOCX")
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString()))))
                    .andExpect(status().isBadRequest());

            verify(reportExportService, never()).export(any(), any(), any());
        }

        @Test
        @DisplayName("[US19] Usuário que não é dono da sala recebe 403 e nenhuma exportação é iniciada")
        void export_NotRoomOwner_Returns403AndNeverCallsService() throws Exception {
            UUID roomId = UUID.randomUUID();
            when(roomSecurity.isOwner(eq(roomId), any(Authentication.class))).thenReturn(false);

            mockMvc.perform(get(EXPORT_URL, roomId).param("format", "PDF")
                            .with(jwt().jwt(j -> j.subject(UUID.randomUUID().toString()))))
                    .andExpect(status().isForbidden());

            verify(reportExportService, never()).export(any(), any(), any());
        }

        @Test
        @DisplayName("[US19] Exportação sem token JWT retorna 401")
        void export_NoToken_Returns401() throws Exception {
            mockMvc.perform(get(EXPORT_URL, UUID.randomUUID()).param("format", "PDF"))
                    .andExpect(status().isUnauthorized());

            verify(reportExportService, never()).export(any(), any(), any());
        }
    }
}
