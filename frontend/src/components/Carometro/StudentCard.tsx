// src/components/Carometro/StudentCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Delete, User } from "lucide-react";
import type { Student } from "../../types/student";

interface StudentCardProps {
  student: Student;
  onAction?: (student: Student) => void;
}

export function StudentCard({ student, onAction }: StudentCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="w-full bg-[#3B4C9B] hover:bg-[#34448C] transition-all duration-200 rounded-full p-2.5 sm:p-3 pr-4 sm:pr-5 flex items-center justify-between shadow-sm border border-white/10">
      {/* Left: Avatar & Name */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white/30 bg-[#2D3A74] flex items-center justify-center">
          {student.avatarUrl && !imageError ? (
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <User className="text-white/80" size={24} />
          )}
        </div>

        {/* Student Name */}
        <span className="text-white font-semibold text-base sm:text-lg truncate tracking-wide">
          {student.name}
        </span>
      </div>

      {/* Right: Tag with 'X' Action Icon */}
      <button
        type="button"
        onClick={() => onAction?.(student)}
        aria-label={`Remover ou desvincular ${student.name}`}
        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer shrink-0 ml-3"
      >
        <Delete size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}
