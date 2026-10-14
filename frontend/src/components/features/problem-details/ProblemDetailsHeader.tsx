// src/components/features/problem-details/ProblemDetailsHeader.tsx
"use client";

import React from "react";
import { ArrowLeft, Share2 } from "lucide-react";

interface ProblemDetailsHeaderProps {
  disciplineTag: string;
  onBack: () => void;
  onShare?: () => void;
}

export function ProblemDetailsHeader({
  disciplineTag,
  onBack,
  onShare,
}: ProblemDetailsHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 px-5 py-3 sticky top-0 z-40 flex items-center justify-between w-full md:max-w-6xl md:mx-auto md:rounded-b-2xl md:border-x">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
        aria-label="Go back"
      >
        <ArrowLeft size={20} className="text-[#182860]" />
      </button>

      <span className="text-sm font-semibold text-[#4354A0] bg-[#EEEDF8] px-4 py-1.5 rounded-full select-none">
        {disciplineTag}
      </span>

      <button
        onClick={onShare}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
        aria-label="Share"
      >
        <Share2 size={18} className="text-gray-500" />
      </button>
    </header>
  );
}
