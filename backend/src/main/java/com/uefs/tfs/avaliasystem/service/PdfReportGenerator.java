package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.dto.ProblemReportResponse;
import com.uefs.tfs.avaliasystem.dto.ReportDocument;
import com.uefs.tfs.avaliasystem.dto.SessionReportResponse;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
public class PdfReportGenerator {

    public byte[] generate(ReportDocument document) {
        List<String> lines = switch (document) {
            case ClassReportResponse classReport -> formatClassReport(classReport);
            case ProblemReportResponse problemReport -> formatProblemReport(problemReport);
            case SessionReportResponse sessionReport -> formatSessionReport(sessionReport);
        };
        return buildMinimalPdf(lines);
    }

    private List<String> formatClassReport(ClassReportResponse report) {
        List<String> lines = new ArrayList<>();
        lines.add("Relatorio Final - " + safe(report.roomName()));
        for (ClassReportResponse.ProblemSummary p : report.problems()) {
            lines.add("Problema: " + safe(p.title()) + " (Peso: " + formatNumber(p.weight()) + ")");
        }
        for (ClassReportResponse.StudentReportRow s : report.students()) {
            StringBuilder row = new StringBuilder(safe(s.studentName()));
            for (ClassReportResponse.ProblemSummary p : report.problems()) {
                Double grade = s.gradesByProblem() != null ? s.gradesByProblem().get(p.id()) : null;
                if (grade != null) {
                    row.append(" | ").append(p.title()).append(": ").append(formatNumber(grade));
                }
            }
            if (s.weightedAverage() != null) {
                row.append(" | Media: ").append(formatNumber(s.weightedAverage()));
            }
            lines.add(row.toString());
        }
        if (report.withdrawnStudents() != null) {
            for (ClassReportResponse.WithdrawnStudentRow w : report.withdrawnStudents()) {
                lines.add("Desistente: " + safe(w.studentName()) + " | Media parcial: " + formatNumber(w.partialAverage()));
            }
        }
        return lines;
    }

    private List<String> formatProblemReport(ProblemReportResponse report) {
        List<String> lines = new ArrayList<>();
        lines.add("Relatorio Parcial - " + safe(report.roomName()));
        if (report.problem() != null) {
            lines.add("Problema: " + safe(report.problem().title()));
        }
        if (report.students() != null) {
            for (ProblemReportResponse.StudentGradeRow s : report.students()) {
                lines.add(safe(s.studentName()) + " | Nota: " + formatNumber(s.grade()));
            }
        }
        if (report.classAverage() != null) {
            lines.add("Media da turma: " + formatNumber(report.classAverage()));
        }
        return lines;
    }

    private List<String> formatSessionReport(SessionReportResponse report) {
        List<String> lines = new ArrayList<>();
        lines.add("Relatorio de Sessao - " + safe(report.roomName()));
        if (report.problem() != null) {
            lines.add("Problema: " + safe(report.problem().title()));
        }
        if (report.students() != null) {
            for (SessionReportResponse.SessionStudentRow s : report.students()) {
                lines.add(safe(s.studentName())
                        + " | Presenca: " + (s.attendance() != null ? s.attendance().name() : "N/A")
                        + " | Nota: " + formatNumber(s.problemGrade()));
            }
        }
        return lines;
    }

    private String formatNumber(Double value) {
        if (value == null) {
            return "-";
        }
        return String.format(Locale.US, "%.2f", value);
    }

    private String safe(String text) {
        return text == null ? "" : text;
    }

    private String escapePdfString(String s) {
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
    }

    private byte[] buildMinimalPdf(List<String> lines) {
        StringBuilder stream = new StringBuilder();
        stream.append("BT\n/F1 10 Tf\n50 780 Td\n14 TL\n");
        for (String line : lines) {
            stream.append("(").append(escapePdfString(line)).append(") Tj T*\n");
        }
        stream.append("ET\n");
        byte[] streamBytes = stream.toString().getBytes(StandardCharsets.ISO_8859_1);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        writeAscii(out, "%PDF-1.4\n");

        List<Integer> offsets = new ArrayList<>();

        // 1: Catalog
        offsets.add(out.size());
        writeAscii(out, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

        // 2: Pages
        offsets.add(out.size());
        writeAscii(out, "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

        // 3: Page
        offsets.add(out.size());
        writeAscii(out, "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n");

        // 4: Font
        offsets.add(out.size());
        writeAscii(out, "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n");

        // 5: Content stream
        offsets.add(out.size());
        writeAscii(out, "5 0 obj\n<< /Length " + streamBytes.length + " >>\nstream\n");
        out.writeBytes(streamBytes);
        writeAscii(out, "endstream\nendobj\n");

        int xrefOffset = out.size();
        writeAscii(out, "xref\n0 " + (offsets.size() + 1) + "\n");
        writeAscii(out, "0000000000 65535 f \n");
        for (int offset : offsets) {
            writeAscii(out, String.format(Locale.US, "%010d 00000 n \n", offset));
        }
        writeAscii(out, "trailer\n<< /Size " + (offsets.size() + 1) + " /Root 1 0 R >>\n");
        writeAscii(out, "startxref\n" + xrefOffset + "\n%%EOF\n");
        return out.toByteArray();
    }

    private void writeAscii(ByteArrayOutputStream out, String s) {
        out.writeBytes(s.getBytes(StandardCharsets.ISO_8859_1));
    }
}
