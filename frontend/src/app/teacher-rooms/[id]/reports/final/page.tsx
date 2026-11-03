// src/app/teacher-rooms/[id]/reports/final/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ProblemDetailsHeader } from "../../../../../components/features/problem-details/ProblemDetailsHeader";
import { ClassReportPanel } from "../../../../../components/features/reports/ClassReportPanel";
import { useRooms } from "../../../../../hooks/useRooms";

// Relatório final da sala (US20)
export default function ClassFinalReportPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = String(params.id);

  const { rooms } = useRooms();
  const room = rooms.find((r) => r.id === roomId);
  const disciplineTag = room ? `${room.code} - ${room.semester ?? ""}` : "...";

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans flex flex-col">
      <ProblemDetailsHeader
        disciplineTag={disciplineTag}
        onBack={() => router.push(`/teacher-rooms/${roomId}/disciplines`)}
        onShare={() => {
          if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
        }}
      />
      <div className="flex-1 w-full max-w-6xl mx-auto px-5 md:px-6 pt-6 pb-10">
        <ClassReportPanel roomId={roomId} />
      </div>
    </main>
  );
}
