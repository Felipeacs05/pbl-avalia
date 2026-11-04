// src/components/features/class-roster/ClassRosterPanel.tsx
"use client";

import React from "react";
import { useClassRoster } from "../../../hooks/useClassRoster";
import { ClassRosterGrid } from "./ClassRosterGrid";

export interface ClassRosterPanelProps {
  roomId: string;
}

export function ClassRosterPanel({ roomId }: ClassRosterPanelProps) {
  const { students, isLoading, error } = useClassRoster(roomId);

  return (
    <div className="w-full">
      {error && (
        <div role="alert" className="p-4 mb-4 text-sm text-red-700 bg-red-50 rounded-2xl border border-red-200">
          {error}
        </div>
      )}
      <ClassRosterGrid students={students} />
    </div>
  );
}

