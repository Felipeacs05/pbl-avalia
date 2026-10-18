import React from "react";
import type { Group, Student } from "@/types/group";
import { GroupCard } from "./GroupCard";

interface GroupListProps {
  groups: Group[];
  canManage?: boolean;
  onEdit?: (group: Group) => void;
  onDelete?: (group: Group) => void;
  onAddMember?: (group: Group) => void;
  onRemoveMember?: (group: Group, student: Student) => void;
}

export function GroupList({
  groups,
  canManage = true,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}: GroupListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          canManage={canManage}
          onEdit={() => onEdit?.(group)}
          onDelete={() => onDelete?.(group)}
          onAddMember={() => onAddMember?.(group)}
          onRemoveMember={(student) => onRemoveMember?.(group, student)}
        />
      ))}
      {groups.length === 0 && (
        <div className="col-span-full py-16 text-center bg-white rounded-[1.5rem] border border-gray-200/80 shadow-xs">
          <p className="text-gray-500 font-medium text-sm">Nenhum grupo criado ainda.</p>
          <p className="text-gray-400 text-xs mt-1">Clique no botão acima para criar o primeiro grupo desta matéria.</p>
        </div>
      )}
    </div>
  );
}