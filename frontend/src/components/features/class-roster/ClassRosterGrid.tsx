/* eslint-disable @next/next/no-img-element */
// src/components/features/class-roster/ClassRosterGrid.tsx
"use client";

import React, { useState } from "react";
import type { ClassRosterStudent } from "../../../types/classRoster";

export interface ClassRosterGridProps {
  students: ClassRosterStudent[];
}

export function ClassRosterGrid({ students }: ClassRosterGridProps) {
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const handleImageError = (id: string) => {
    setBrokenImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <ul role="list" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 list-none p-0">
      {students.map((student) => {
        const hasPhoto = Boolean(student.profileImageUrl) && !brokenImages[student.id];

        return (
          <li
            key={student.id}
            role="listitem"
            className="flex flex-col items-center p-3 rounded-2xl bg-white border border-gray-100 shadow-xs"
          >
            <div className="w-16 h-16 rounded-full overflow-hidden bg-[#757DC3] text-white flex items-center justify-center font-bold text-sm mb-2">
              {hasPhoto ? (
                <img
                  src={student.profileImageUrl!}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(student.id)}
                />
              ) : (
                <span>{student.initials}</span>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-800 text-center truncate max-w-full">
              {student.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
