// src/components/features/problem-details/PastSessionsList.tsx
"use client";

import React from "react";
import { Calendar } from "lucide-react";
import type { Session } from "../../../types/problem";
import { SessionCard } from "./SessionCard";

interface PastSessionsListProps {
  sessions: Session[];
}

export function PastSessionsList({ sessions }: PastSessionsListProps) {
  return (
    <section className="w-full">
      <h2 className="text-lg font-bold text-gray-800 text-center md:text-left mb-4">
        Sessões Passadas
      </h2>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">
            Nenhuma sessão registrada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-1 lg:space-y-4 lg:gap-0">
          {sessions.map((session, index) => (
            <SessionCard key={session.id} session={session} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}
