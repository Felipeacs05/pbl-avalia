package com.uefs.tfs.avaliasystem.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Relatório final da turma (US19/US20).
 * <ul>
 *   <li>{@code students}: alunos ATIVOS, ordem alfabética.</li>
 *   <li>{@code withdrawnStudents}: alunos com vínculo encerrado que chegaram a ter nota (média parcial),
 *       para fechar a ata sem esconder quem trancou no meio do semestre.</li>
 *   <li>{@code warnings}: dados inválidos (peso/nota fora do domínio) que foram desconsiderados no cálculo.</li>
 * </ul>
 */
public record ClassReportResponse(
        UUID roomId,
        String roomName,
        List<ProblemSummary> problems,
        List<StudentReportRow> students,
        List<UUID> openProblemIds,
        List<WithdrawnStudentRow> withdrawnStudents,
        List<ReportWarning> warnings
) implements ReportDocument {

    public ClassReportResponse(UUID roomId, String roomName, List<ProblemSummary> problems,
                               List<StudentReportRow> students, List<UUID> openProblemIds) {
        this(roomId, roomName, problems, students, openProblemIds, List.of(), List.of());
    }

    public record ProblemSummary(UUID id, String title, Double weight) {}

    public record StudentReportRow(
            UUID studentId,
            String studentName,
            Map<UUID, Double> gradesByProblem,
            Double weightedAverage,
            List<UUID> pendingProblemIds
    ) {}

    public record WithdrawnStudentRow(
            UUID studentId,
            String studentName,
            Instant unlinkedAt,
            Map<UUID, Double> gradesByProblem,
            Double partialAverage
    ) {}

    public record ReportWarning(String code, UUID problemId, UUID studentId, String message) {
        public static final String INVALID_WEIGHT = "INVALID_WEIGHT";
        public static final String INVALID_GRADE = "INVALID_GRADE";
    }
}
