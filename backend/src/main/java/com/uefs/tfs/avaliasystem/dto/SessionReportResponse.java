package com.uefs.tfs.avaliasystem.dto;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.ProblemSummary;
import com.uefs.tfs.avaliasystem.dto.ClassReportResponse.ReportWarning;
import com.uefs.tfs.avaliasystem.model.AttendanceStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Relatório de UMA sessão tutorial: presença de cada aluno ativo + nota do problema da sessão (US19). */
public record SessionReportResponse(
        UUID roomId,
        String roomName,
        UUID sessionId,
        ProblemSummary problem,
        List<SessionStudentRow> students,
        List<ReportWarning> warnings
) implements ReportDocument {

    /** {@code attendance} é nulo quando a chamada ainda não foi registrada para o aluno. */
    public record SessionStudentRow(
            UUID studentId,
            String studentName,
            AttendanceStatus attendance,
            Instant recordedAt,
            Double problemGrade
    ) {}
}
