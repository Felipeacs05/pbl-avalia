package com.uefs.tfs.avaliasystem.dto;

/**
 * Qualquer relatório exportável. Sealed: os geradores de PDF/XLSX tratam todos os casos
 * com switch exaustivo, e um novo tipo de relatório quebra a compilação até ser tratado.
 */
public sealed interface ReportDocument permits ClassReportResponse, ProblemReportResponse, SessionReportResponse {
}
