// src/components/features/evaluations/EvaluationToggleCard.tsx
"use client";

import React from "react";

interface EvaluationToggleCardProps {
  id?: string;
  title: string;
  description: string;
  isChecked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function EvaluationToggleCard({
  id,
  title,
  description,
  isChecked,
  onToggle,
  disabled = false,
}: EvaluationToggleCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      id={id}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`w-full rounded-2xl border border-white/30 p-4 sm:p-5 flex items-center justify-between gap-4 transition-all duration-200 text-left select-none ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:border-white/50 active:scale-[0.99]"
      } ${isChecked ? "bg-white/[0.04]" : "bg-transparent"}`}
    >
      {/* Title & Description */}
      <div className="flex-1 pr-2">
        <h4 className="text-white font-semibold text-base tracking-wide">
          {title}
        </h4>
        <p className="text-[#C4CAEC] text-xs sm:text-[13px] leading-relaxed mt-1">
          {description}
        </p>
      </div>

      {/* Switch Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/40 ${
          isChecked ? "bg-[#B3BAE5]" : "bg-[#7B7B7B]"
        } ${disabled ? "cursor-not-allowed" : ""}`}
      >
        <span className="sr-only">{title}</span>
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
            isChecked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
