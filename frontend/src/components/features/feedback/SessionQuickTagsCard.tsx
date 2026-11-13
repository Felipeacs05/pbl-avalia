// src/components/features/feedback/SessionQuickTagsCard.tsx
"use client";

import React from "react";

export interface SessionQuickTagsCardProps {
  tags?:
    | string[]
    | { positive?: string[]; negative?: string[]; comments?: string[] }
    | Record<string, unknown>
    | null;
}

export function SessionQuickTagsCard({ tags }: SessionQuickTagsCardProps) {
  const normalizedTags: string[] = React.useMemo(() => {
    if (!tags) return [];
    if (Array.isArray(tags)) {
      return tags.filter(
        (t): t is string => typeof t === "string" && t.trim().length > 0
      );
    }
    if (typeof tags === "object") {
      const list: string[] = [];
      const obj = tags as Record<string, unknown>;
      ["positive", "negative", "comments", "tags"].forEach((key) => {
        const val = obj[key];
        if (Array.isArray(val)) {
          val.forEach((item) => {
            if (typeof item === "string" && item.trim().length > 0) {
              list.push(item);
            }
          });
        }
      });
      if (list.length > 0) return list;

      return Object.values(obj)
        .flatMap((v) =>
          Array.isArray(v) ? v : typeof v === "string" ? [v] : []
        )
        .filter(
          (t): t is string => typeof t === "string" && t.trim().length > 0
        );
    }
    return [];
  }, [tags]);

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
        {normalizedTags.length === 0 ? (
          <p className="text-sm font-medium text-white/80 py-4 text-center">
            Nenhuma marcação recebida nesta sessão.
          </p>
        ) : (
          normalizedTags.map((tag, index) => {
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
          })
        )}
      </div>
    </section>
  );
}
