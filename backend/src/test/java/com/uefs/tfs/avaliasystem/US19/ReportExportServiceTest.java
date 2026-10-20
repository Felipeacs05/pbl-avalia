package com.uefs.tfs.avaliasystem.US19;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.dto.ProblemReportResponse;
import com.uefs.tfs.avaliasystem.exception.ExportInProgressException;
import com.uefs.tfs.avaliasystem.exception.ExportTimeoutException;
import com.uefs.tfs.avaliasystem.model.ExportFormat;
import com.uefs.tfs.avaliasystem.service.ClassReportService;
import com.uefs.tfs.avaliasystem.service.ExportedFile;
import com.uefs.tfs.avaliasystem.service.PdfReportGenerator;
import com.uefs.tfs.avaliasystem.service.ReportExportService;
import com.uefs.tfs.avaliasystem.service.SpreadsheetReportGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportExportServiceTest {

    private static final String IN_PROGRESS_MESSAGE =
            "Relatório em processamento. Aguarde a conclusão antes de solicitar novamente.";
    private static final byte[] PDF_BYTES = "%PDF-1.7 conteudo".getBytes();
    private static final byte[] XLSX_BYTES = "PK-planilha".getBytes();

    @InjectMocks
    private ReportExportService service;

    @Mock
    private ClassReportService classReportService;

    @Mock
    private PdfReportGenerator pdfGenerator;

    @Mock
    private SpreadsheetReportGenerator spreadsheetGenerator;

    private UUID tutorId;
    private UUID roomId;
    private ClassReportResponse report;
    private ProblemReportResponse partialReport;

    @BeforeEach
    void setUp() {
        tutorId = UUID.randomUUID();
        roomId = UUID.randomUUID();
        report = new ClassReportResponse(roomId, "Módulo PBL 1", List.of(), List.of(), List.of(), List.of(), List.of());
        partialReport = new ProblemReportResponse(roomId, "Módulo PBL 1",
                new ClassReportResponse.ProblemSummary(UUID.randomUUID(), "P1", 2.0),
                false, List.of(), 7.0, List.of());
    }

    @Nested
    @DisplayName("[US19] Disponibilidade de download e TTL")
    class DownloadScenarios {

        @Test
        @DisplayName("[US19] Exportação parcial em PDF devolve arquivo validado para o problema específico")
        void exportProblem_Pdf_ReturnsDownloadableFile() {
            UUID problemId = UUID.randomUUID();
            when(classReportService.generateProblemReport(roomId, problemId, tutorId)).thenReturn(partialReport);
            when(pdfGenerator.generate(partialReport)).thenReturn(PDF_BYTES);

            ExportedFile file = service.exportProblem(roomId, problemId, tutorId, ExportFormat.PDF);

            assertThat(file.contentType()).isEqualTo("application/pdf");
            assertThat(file.fileName()).endsWith(".pdf");
            assertThat(file.content()).isEqualTo(PDF_BYTES);
        }

        @Test
        @DisplayName("[US19] Exportação em PDF devolve arquivo com nome, tipo e bytes")
        void export_Pdf_ReturnsDownloadableFile() {
            when(classReportService.generateClassReport(roomId, tutorId)).thenReturn(report);
            when(pdfGenerator.generate(report)).thenReturn(PDF_BYTES);

            ExportedFile file = service.export(roomId, tutorId, ExportFormat.PDF);

            assertThat(file.contentType()).isEqualTo("application/pdf");
            assertThat(file.fileName()).endsWith(".pdf");
            assertThat(file.content()).isEqualTo(PDF_BYTES);
            verify(spreadsheetGenerator, never()).generate(any());
        }

        @Test
        @DisplayName("[US19] Exportação em planilha devolve arquivo XLSX com nome, tipo e bytes")
        void export_Xlsx_ReturnsDownloadableFile() {
            when(classReportService.generateClassReport(roomId, tutorId)).thenReturn(report);
            when(spreadsheetGenerator.generate(report)).thenReturn(XLSX_BYTES);

            ExportedFile file = service.export(roomId, tutorId, ExportFormat.XLSX);

            assertThat(file.contentType()).isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            assertThat(file.fileName()).endsWith(".xlsx");
            assertThat(file.content()).isEqualTo(XLSX_BYTES);
            verify(pdfGenerator, never()).generate(any());
        }

        @Test
        @DisplayName("[US19] Falha por Timeout (TTL) na geração quebra o bloqueio e libera a trava para novas requisições")
        void export_TimeoutEviction_ReleasesLockForNewRequests() {
            when(classReportService.generateClassReport(roomId, tutorId)).thenReturn(report);
            when(pdfGenerator.generate(report))
                    .thenThrow(new ExportTimeoutException("Timeout de execução (TTL excedido) simulado"))
                    .thenReturn(PDF_BYTES);

            assertThrows(ExportTimeoutException.class, () -> service.export(roomId, tutorId, ExportFormat.PDF));

            // The lock must have been evicted/released, allowing a subsequent attempt to work
            assertThat(service.export(roomId, tutorId, ExportFormat.PDF).content())
                    .isEqualTo(PDF_BYTES);
        }
    }

    @Nested
    @DisplayName("[US19] Bloqueio de cliques simultâneos (gargalo de I/O)")
    class ConcurrencyScenarios {

        @Test
        @DisplayName("[US19] 10 cliques simultâneos geram o arquivo uma única vez e recusam os outros 9")
        void export_SimultaneousClicks_GeneratesOnlyOnceAndRejectsTheRest() throws Exception {
            int clicks = 10;
            CountDownLatch generatorEntered = new CountDownLatch(1);
            CountDownLatch releaseGenerator = new CountDownLatch(1);
            CountDownLatch rejectedClicks = new CountDownLatch(clicks - 1);
            CountDownLatch startGate = new CountDownLatch(1);
            AtomicInteger succeeded = new AtomicInteger();
            AtomicInteger rejected = new AtomicInteger();

            when(classReportService.generateClassReport(roomId, tutorId)).thenReturn(report);
            when(pdfGenerator.generate(report)).thenAnswer(invocation -> {
                generatorEntered.countDown();
                if (!releaseGenerator.await(10, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("O teste não liberou o gerador a tempo");
                }
                return PDF_BYTES;
            });

            ExecutorService pool = Executors.newFixedThreadPool(clicks);
            List<Future<Boolean>> futures = new ArrayList<>();
            for (int i = 0; i < clicks; i++) {
                Callable<Boolean> click = () -> {
                    startGate.await();
                    try {
                        service.export(roomId, tutorId, ExportFormat.PDF);
                        succeeded.incrementAndGet();
                    } catch (ExportInProgressException exception) {
                        assertThat(exception.getMessage()).isEqualTo(IN_PROGRESS_MESSAGE);
                        rejected.incrementAndGet();
                        rejectedClicks.countDown();
                    }
                    return true;
                };
                futures.add(pool.submit(click));
            }

            try {
                startGate.countDown();
                assertThat(generatorEntered.await(5, TimeUnit.SECONDS)).isTrue();
                assertThat(rejectedClicks.await(5, TimeUnit.SECONDS)).isTrue();
                releaseGenerator.countDown();
                for (Future<Boolean> future : futures) {
                    future.get(10, TimeUnit.SECONDS);
                }
            } finally {
                releaseGenerator.countDown();
                pool.shutdownNow();
            }

            assertThat(succeeded.get()).isEqualTo(1);
            assertThat(rejected.get()).isEqualTo(clicks - 1);
            verify(pdfGenerator, times(1)).generate(report);
        }

        @Test
        @DisplayName("[US19] Clique durante a geração é recusado com a mensagem de processamento")
        void export_ClickWhileProcessing_ThrowsInProgressMessage() throws Exception {
            CountDownLatch generatorEntered = new CountDownLatch(1);
            CountDownLatch releaseGenerator = new CountDownLatch(1);
            when(classReportService.generateClassReport(roomId, tutorId)).thenReturn(report);
            when(pdfGenerator.generate(report)).thenAnswer(invocation -> {
                generatorEntered.countDown();
                releaseGenerator.await(10, TimeUnit.SECONDS);
                return PDF_BYTES;
            });
            ExecutorService pool = Executors.newSingleThreadExecutor();
            Future<ExportedFile> firstClick = pool.submit(() -> service.export(roomId, tutorId, ExportFormat.PDF));

            try {
                assertThat(generatorEntered.await(5, TimeUnit.SECONDS)).isTrue();
                ExportInProgressException exception = assertThrows(ExportInProgressException.class,
                        () -> service.export(roomId, tutorId, ExportFormat.PDF));
                assertThat(exception.getMessage()).isEqualTo(IN_PROGRESS_MESSAGE);
            } finally {
                releaseGenerator.countDown();
            }
            assertThat(firstClick.get(10, TimeUnit.SECONDS).content()).isEqualTo(PDF_BYTES);
            pool.shutdownNow();
        }
    }
}
