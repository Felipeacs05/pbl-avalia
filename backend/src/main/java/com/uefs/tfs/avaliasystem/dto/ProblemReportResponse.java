package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.ProblemSummary;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.ReportWarning;

import java.util.List;
import java.util.UUID;

/** Relatório de UM problema (entrega) isolado (US19: exportação parcial). */
public record ProblemReportResponse(
        UUID roomId,
        String roomName,
        ProblemSummary problem,
        boolean open,
        List<StudentGradeRow> students,
        Double classAverage,
        List<ReportWarning> warnings
) implements ReportDocument {

    public record StudentGradeRow(UUID studentId, String studentName, Double grade, boolean pending) {}
}
