"use client";

import React from "react";
import { useClassRoster } from "@/hooks/useClassRoster";
import { ClassRosterGrid } from "./ClassRosterGrid";

interface ClassRosterPanelProps {
  roomId: string;
}

export function ClassRosterPanel({ roomId }: ClassRosterPanelProps) {
  const { students, isLoading } = useClassRoster(roomId);

  return (
    <div className="w-full">
      {isLoading && students.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Carregando carômetro...</p>
      ) : (
        <ClassRosterGrid students={students} />
      )}
    </div>
  );
}
