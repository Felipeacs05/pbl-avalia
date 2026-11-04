// src/components/features/reports/ClassReportPanel.tsx
"use client";

import React from "react";
import { useClassReport } from "../../../hooks/useClassReport";
import { ClassReportTable } from "./ClassReportTable";
import { WithdrawnStudentsTable } from "./WithdrawnStudentsTable";

// Relatório final da sala (US20): notas por problema, média ponderada e, à parte, quem saiu da sala
export function ClassReportPanel({ roomId }: { roomId: string }) {
  const { report, isLoading, error } = useClassReport(roomId);
  const canShowReport = !isLoading && !error && report !== null;

  return (
    <section className="w-full flex flex-col gap-5">
      {canShowReport && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Relatório final</p>
          <h2 className="text-xl font-bold text-gray-900">{report.roomName}</h2>
        </div>
      )}

      <ClassReportTable report={report} isLoading={isLoading} error={error} />

      {canShowReport && <WithdrawnStudentsTable problems={report.problems} students={report.withdrawnStudents} />}
    </section>
  );
}
