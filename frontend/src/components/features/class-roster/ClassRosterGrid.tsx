"use client";

import React from "react";
import type { ClassRosterStudent } from "@/types/classRoster";
import { Avatar } from "@/components/ui/Avatar";

interface ClassRosterGridProps {
  students: ClassRosterStudent[];
}

export function ClassRosterGrid({ students }: ClassRosterGridProps) {
  return (
    <ul role="list" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {students.map((student) => (
        <li
          key={student.id}
          role="listitem"
          className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-center"
        >
          <Avatar
            src={student.profileImageUrl ?? undefined}
            alt=""
            initials={student.initials}
            lazy
            sizeClassName="w-16 h-16 mb-2"
          />
          <span className="text-sm font-semibold text-gray-800 line-clamp-2">
            {student.name}
          </span>
        </li>
      ))}
    </ul>
  );
}
