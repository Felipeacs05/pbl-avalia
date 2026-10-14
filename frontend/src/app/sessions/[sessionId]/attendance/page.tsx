// src/app/sessions/[sessionId]/attendance/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { AttendanceSessionView } from "@/components/features/attendance/AttendanceSessionView";

export default function DirectSessionAttendancePage() {
  const params = useParams();
  const router = useRouter();

  const sessionId = String(params.sessionId);

  return (
    <AttendanceSessionView
      sessionId={sessionId}
      onBack={() => router.back()}
    />
  );
}
