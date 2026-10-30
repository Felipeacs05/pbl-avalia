// src/components/features/feedback/SessionQuickTagsCard.tsx
"use client";

import React from "react";

export interface SessionQuickTagsCardProps {
  tags: string[];
}

export function SessionQuickTagsCard({ tags }: SessionQuickTagsCardProps) {
  return (
    <section
      aria-label="Marcações rápidas de feedback da sessão"
      className="w-full rounded-2xl bg-gradient-to-br from-[#3B4899] to-[#4354A0] border-2 border-[#313E7B] p-6 text-white shadow-md relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full -translate-y-10 translate-x-10 pointer-events-none" />

      <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-5 tracking-tight drop-shadow-xs">
        Feedback
      </h2>

      <div className="flex flex-wrap gap-2.5 justify-center">
        {tags.map((tag, index) => {
          const isLong = tag.length > 22;
          return (
            <div
              key={`${tag}-${index}`}
              className={`${
                isLong
                  ? "w-full rounded-2xl px-4 py-3 text-left"
                  : "rounded-full px-5 py-2 text-center"
              } bg-[#8D9BD9]/90 border border-white/25 text-white font-semibold text-sm sm:text-base leading-snug shadow-xs`}
            >
              {tag}
            </div>
          );
        })}
      </div>
    </section>
  );
}
