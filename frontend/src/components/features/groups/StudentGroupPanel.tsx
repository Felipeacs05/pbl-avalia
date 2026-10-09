import React from "react";
import { useMyGroup } from "@/hooks/useMyGroup";
import { GroupCard } from "./GroupCard";

export function StudentGroupPanel({ roomId }: { roomId: string }) {
  const { group, isLoading } = useMyGroup(roomId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 font-medium">
        Carregando seu grupo...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 text-center bg-white rounded-[1.5rem] border border-gray-200 shadow-xs max-w-xl mx-auto">
        <p className="text-gray-500 font-medium">Você ainda não está em nenhum grupo.</p>
        <p className="text-gray-400 text-xs mt-1">Aguarde o tutor da sala realizar a alocação dos membros.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 tracking-tight">Meu Grupo</h2>
      <GroupCard group={group} canManage={false} />
    </div>
  );
}