// src/components/features/attendance/AttendanceSessionView.tsx
"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useRooms } from "../../../hooks/useRooms";
import { useSessionRoster } from "../../../hooks/useSessionRoster";
import { AttendancePanel } from "./AttendancePanel";
import { SessionTitle } from "./SessionTitle";

interface AttendanceSessionViewProps {
  roomId?: string;
  problemId?: string;
  sessionId: string;
  onBack: () => void;
}

export function AttendanceSessionView({
  roomId,
  sessionId,
  onBack,
}: AttendanceSessionViewProps) {
  const { rooms } = useRooms();
  const { roster, dateLabel, isLoading, error } = useSessionRoster(sessionId);

  const room = roomId ? rooms.find((r) => r.id === roomId) : null;
  const roomCodeTag = room
    ? `${room.code} - ${room.semester ?? "2026.2"}`
    : "TEC499 - 2026.2";

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-gray-800 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200/70 sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all text-gray-800 cursor-pointer"
          aria-label="Voltar para o problema"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="bg-[#C5CCE8] text-[#2E3A70] text-xs font-semibold px-5 py-1.5 rounded-full tracking-wide select-none">
          {roomCodeTag}
        </div>

        {/* Espaçador para balancear o cabeçalho */}
        <div className="w-10" aria-hidden="true" />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Session Badge Box & Date */}
        <SessionTitle dateLabel={dateLabel} />

        {/* Content State: Loading, Error or Roster */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#4354A0] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 animate-pulse font-medium">
              Carregando chamada da sessão...
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        ) : roster ? (
          <div className="w-full flex-1">
            <AttendancePanel
              key={roster.id}
              sessionId={roster.id}
              students={roster.students}
            />
          </div>
        ) : null}

        {/* End Session Button */}
        <div className="w-full pt-4 pb-6 mt-auto">
          <button
            type="button"
            className="w-full bg-[#757DC3] hover:bg-[#6870B5] active:scale-[0.99] text-white py-3.5 px-6 rounded-2xl font-semibold text-base shadow-sm transition-all text-center cursor-pointer"
          >
            Encerrar Sessão
          </button>
        </div>
      </main>
    </div>
  );
}
