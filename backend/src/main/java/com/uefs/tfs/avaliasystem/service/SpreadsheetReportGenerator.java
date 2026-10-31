package com.uefs.tfs.avaliasystem.service;

import com.uefs.tfs.avaliasystem.dto.ClassReportResponse;
import com.uefs.tfs.avaliasystem.dto.ProblemReportResponse;
import com.uefs.tfs.avaliasystem.dto.ReportDocument;
import com.uefs.tfs.avaliasystem.dto.SessionReportResponse;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class SpreadsheetReportGenerator {

    public byte[] generate(ReportDocument document) {
        List<List<Object>> rows = switch (document) {
            case ClassReportResponse classReport -> buildClassRows(classReport);
            case ProblemReportResponse problemReport -> buildProblemRows(problemReport);
            case SessionReportResponse sessionReport -> buildSessionRows(sessionReport);
        };
        return buildMinimalXlsx(rows);
    }

    private List<List<Object>> buildClassRows(ClassReportResponse report) {
        List<List<Object>> rows = new ArrayList<>();
        List<Object> header = new ArrayList<>();
        header.add("Aluno");
        for (ClassReportResponse.ProblemSummary p : report.problems()) {
            header.add(p.title());
        }
        header.add("Média Ponderada");
        rows.add(header);

        for (ClassReportResponse.StudentReportRow s : report.students()) {
            List<Object> row = new ArrayList<>();
            row.add(s.studentName());
            for (ClassReportResponse.ProblemSummary p : report.problems()) {
                Double grade = s.gradesByProblem() != null ? s.gradesByProblem().get(p.id()) : null;
                row.add(grade);
            }
            row.add(s.weightedAverage());
            rows.add(row);
        }

        if (report.withdrawnStudents() != null && !report.withdrawnStudents().isEmpty()) {
            for (ClassReportResponse.WithdrawnStudentRow w : report.withdrawnStudents()) {
                List<Object> row = new ArrayList<>();
                row.add(w.studentName());
                for (ClassReportResponse.ProblemSummary p : report.problems()) {
                    Double grade = w.gradesByProblem() != null ? w.gradesByProblem().get(p.id()) : null;
                    row.add(grade);
                }
                row.add(w.partialAverage());
                rows.add(row);
            }
        }
        return rows;
    }

    private List<List<Object>> buildProblemRows(ProblemReportResponse report) {
        List<List<Object>> rows = new ArrayList<>();
        String problemTitle = report.problem() != null ? report.problem().title() : "Problema";
        rows.add(List.of("Aluno", problemTitle));
        if (report.students() != null) {
            for (ProblemReportResponse.StudentGradeRow s : report.students()) {
                List<Object> row = new ArrayList<>();
                row.add(s.studentName());
                row.add(s.grade());
                rows.add(row);
            }
        }
        return rows;
    }

    private List<List<Object>> buildSessionRows(SessionReportResponse report) {
        List<List<Object>> rows = new ArrayList<>();
        String problemTitle = report.problem() != null ? report.problem().title() : "Problema";
        rows.add(List.of("Aluno", "Presença", problemTitle));
        if (report.students() != null) {
            for (SessionReportResponse.SessionStudentRow s : report.students()) {
                List<Object> row = new ArrayList<>();
                row.add(s.studentName());
                row.add(s.attendance() != null ? s.attendance().name() : "");
                row.add(s.problemGrade());
                rows.add(row);
            }
        }
        return rows;
    }

    private byte[] buildMinimalXlsx(List<List<Object>> rows) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(baos, StandardCharsets.UTF_8)) {

            writeEntry(zos, "[Content_Types].xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                      <Default Extension="xml" ContentType="application/xml"/>
                      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                    </Types>
                    """);

            writeEntry(zos, "_rels/.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                    </Relationships>
                    """);

            writeEntry(zos, "xl/workbook.xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                      <sheets>
                        <sheet name="Relatorio" sheetId="1" r:id="rId1"/>
                      </sheets>
                    </workbook>
                    """);

            writeEntry(zos, "xl/_rels/workbook.xml.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                    </Relationships>
                    """);

            writeEntry(zos, "xl/worksheets/sheet1.xml", buildSheetXml(rows));

            zos.finish();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Erro ao gerar planilha XLSX", e);
        }
    }

    private String buildSheetXml(List<List<Object>> rows) {
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
        sb.append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">\n");
        sb.append("  <sheetData>\n");
        for (int r = 0; r < rows.size(); r++) {
            int rowNum = r + 1;
            sb.append("    <row r=\"").append(rowNum).append("\">\n");
            List<Object> row = rows.get(r);
            for (int c = 0; c < row.size(); c++) {
                Object val = row.get(c);
                if (val == null) {
                    continue;
                }
                String cellRef = columnName(c) + rowNum;
                if (val instanceof Number num) {
                    sb.append("      <c r=\"").append(cellRef).append("\"><v>")
                            .append(String.format(Locale.US, "%s", num.doubleValue()))
                            .append("</v></c>\n");
                } else {
                    sb.append("      <c r=\"").append(cellRef).append("\" t=\"inlineStr\"><is><t>")
                            .append(escapeXml(String.valueOf(val)))
                            .append("</t></is></c>\n");
                }
            }
            sb.append("    </row>\n");
        }
        sb.append("  </sheetData>\n");
        sb.append("</worksheet>\n");
        return sb.toString();
    }

    private String columnName(int index) {
        StringBuilder sb = new StringBuilder();
        int n = index;
        while (n >= 0) {
            sb.insert(0, (char) ('A' + (n % 26)));
            n = (n / 26) - 1;
        }
        return sb.toString();
    }

    private String escapeXml(String s) {
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private void writeEntry(ZipOutputStream zos, String name, String content) throws IOException {
        ZipEntry entry = new ZipEntry(name);
        zos.putNextEntry(entry);
        zos.write(content.getBytes(StandardCharsets.UTF_8));
        zos.closeEntry();
    }
}
