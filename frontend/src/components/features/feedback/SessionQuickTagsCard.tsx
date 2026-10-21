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
      className="w-full rounded-[2rem] bg-[#4354A0] border-[3px] border-[#313E7B] p-6 text-white shadow-md"
    >
      <h2 className="text-3xl font-bold text-center text-white mb-5 tracking-tight">
        Feedback
      </h2>

      <div className="flex flex-wrap gap-3 justify-center">
        {tags.map((tag, index) => {
          const isLong = tag.length > 22;
          return (
            <div
              key={`${tag}-${index}`}
              className={`${
                isLong ? "w-full rounded-[1.5rem] px-5 py-3.5 text-left" : "rounded-full px-5 py-2.5 text-center"
              } bg-[#94A1DE] border-2 border-[#7685CD] text-white font-semibold text-base sm:text-lg leading-snug shadow-xs`}
            >
              {tag}
            </div>
          );
        })}
      </div>
    </section>
  );
}
