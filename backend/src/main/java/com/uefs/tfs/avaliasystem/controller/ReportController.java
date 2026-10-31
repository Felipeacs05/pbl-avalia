package com.uefs.tfs.avaliasystem.controller;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.model.ExportFormat;
import com.uefs.tfs.avaliasystem.service.ClassReportService;
import com.uefs.tfs.avaliasystem.service.ExportedFile;
import com.uefs.tfs.avaliasystem.service.ReportExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}")
@RequiredArgsConstructor
public class ReportController {

    private final ClassReportService classReportService;
    private final ReportExportService reportExportService;

    @GetMapping("/reports/final")
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public ResponseEntity<ClassReportResponse> getFinalReport(
            @PathVariable UUID roomId,
            Authentication authentication
    ) {
        UUID tutorId = UUID.fromString(authentication.getName());
        ClassReportResponse report = classReportService.generateClassReport(roomId, tutorId);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/reports/export")
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public ResponseEntity<byte[]> exportFinalReport(
            @PathVariable UUID roomId,
            @RequestParam("format") String format,
            Authentication authentication
    ) {
        ExportFormat exportFormat = ExportFormat.from(format);
        UUID tutorId = UUID.fromString(authentication.getName());
        ExportedFile file = reportExportService.export(roomId, tutorId, exportFormat);
        return toAttachmentResponse(file);
    }

    @GetMapping("/problems/{problemId}/export")
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public ResponseEntity<byte[]> exportProblemReport(
            @PathVariable UUID roomId,
            @PathVariable UUID problemId,
            @RequestParam("format") String format,
            Authentication authentication
    ) {
        ExportFormat exportFormat = ExportFormat.from(format);
        UUID tutorId = UUID.fromString(authentication.getName());
        ExportedFile file = reportExportService.exportProblem(roomId, problemId, tutorId, exportFormat);
        return toAttachmentResponse(file);
    }

    @GetMapping("/sessions/{sessionId}/export")
    @PreAuthorize("@roomSecurity.isOwner(#roomId, authentication)")
    public ResponseEntity<byte[]> exportSessionReport(
            @PathVariable UUID roomId,
            @PathVariable UUID sessionId,
            @RequestParam("format") String format,
            Authentication authentication
    ) {
        ExportFormat exportFormat = ExportFormat.from(format);
        UUID tutorId = UUID.fromString(authentication.getName());
        ExportedFile file = reportExportService.exportSession(roomId, sessionId, tutorId, exportFormat);
        return toAttachmentResponse(file);
    }

    private ResponseEntity<byte[]> toAttachmentResponse(ExportedFile file) {
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(file.fileName())
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.parseMediaType(file.contentType()))
                .body(file.content());
    }
}
