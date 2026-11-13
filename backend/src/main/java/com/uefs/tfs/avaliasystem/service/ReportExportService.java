package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.dto.ProblemReportResponse;
import com.uefs.tfs.avaliasystem.dto.ReportDocument;
import com.uefs.tfs.avaliasystem.dto.SessionReportResponse;
import com.uefs.tfs.avaliasystem.exception.ExportInProgressException;
import com.uefs.tfs.avaliasystem.model.ExportFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class ReportExportService {

    private static final String IN_PROGRESS_MESSAGE =
            "Relatório em processamento. Aguarde a conclusão antes de solicitar novamente.";
    private static final Duration LOCK_TTL = Duration.ofSeconds(60);

    private final ClassReportService classReportService;
    private final PdfReportGenerator pdfGenerator;
    private final SpreadsheetReportGenerator spreadsheetGenerator;

    private final ConcurrentHashMap<String, Instant> activeExports = new ConcurrentHashMap<>();

    public ExportedFile export(UUID roomId, UUID tutorId, ExportFormat format) {
        return executeWithLock(lockKey(roomId, tutorId), () -> {
            ClassReportResponse report = classReportService.generateClassReport(roomId, tutorId);
            byte[] bytes = generateBytes(report, format);
            return new ExportedFile("relatorio-final." + format.extension(), format.contentType(), bytes);
        });
    }

    public ExportedFile exportProblem(UUID roomId, UUID problemId, UUID tutorId, ExportFormat format) {
        return executeWithLock(lockKey(roomId, tutorId), () -> {
            ProblemReportResponse report = classReportService.generateProblemReport(roomId, problemId, tutorId);
            byte[] bytes = generateBytes(report, format);
            return new ExportedFile("relatorio-parcial." + format.extension(), format.contentType(), bytes);
        });
    }

    public ExportedFile exportSession(UUID roomId, UUID sessionId, UUID tutorId, ExportFormat format) {
        return executeWithLock(lockKey(roomId, tutorId), () -> {
            SessionReportResponse report = classReportService.generateSessionReport(roomId, sessionId, tutorId);
            byte[] bytes = generateBytes(report, format);
            return new ExportedFile("relatorio-sessao." + format.extension(), format.contentType(), bytes);
        });
    }

    private byte[] generateBytes(ReportDocument document, ExportFormat format) {
        return switch (format) {
            case PDF -> pdfGenerator.generate(document);
            case XLSX -> spreadsheetGenerator.generate(document);
        };
    }

    private String lockKey(UUID roomId, UUID tutorId) {
        return roomId + ":" + tutorId;
    }

    private ExportedFile executeWithLock(String key, Supplier<ExportedFile> action) {
        Instant now = Instant.now();
        AtomicBoolean acquired = new AtomicBoolean(false);

        activeExports.compute(key, (k, existingStart) -> {
            if (existingStart == null || Duration.between(existingStart, now).compareTo(LOCK_TTL) > 0) {
                acquired.set(true);
                return now;
            }
            return existingStart;
        });

        if (!acquired.get()) {
            throw new ExportInProgressException(IN_PROGRESS_MESSAGE);
        }

        try {
            return action.get();
        } finally {
            activeExports.remove(key, now);
        }
    }
}
