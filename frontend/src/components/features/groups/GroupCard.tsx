import React from "react";
import { Pencil, Trash2, UserPlus, UserMinus, Users } from "lucide-react";
import type { Group, Student } from "@/types/group";

interface GroupCardProps {
  group: Group;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddMember?: () => void;
  onRemoveMember?: (student: Student) => void;
}

export function GroupCard({
  group,
  canManage = true,
  onEdit,
  onDelete,
  onAddMember,
  onRemoveMember,
}: GroupCardProps) {
  return (
    <section 
      aria-label={group.name} 
      className="bg-[#4354A0] text-white rounded-[1.5rem] p-5 md:p-6 shadow-md transition-all hover:shadow-lg flex flex-col justify-between"
    >
      <div>
        {/* CABEÇALHO DO CARD */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <Users size={16} className="text-white" />
            </div>
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-white">{group.name}</h3>
          </div>

          {canManage && (
            <div className="flex items-center gap-1">
              <button
                onClick={onEdit}
                aria-label="Editar"
                className="p-2 text-white/75 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Editar grupo"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={onDelete}
                aria-label="Excluir"
                className="p-2 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded-xl transition-colors"
                title="Excluir grupo"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        {/* LISTAGEM DE MEMBROS */}
        <ul className="space-y-2 mb-5">
          {group.members.map((member) => (
            <li 
              key={member.id} 
              className="flex justify-between items-center bg-white/10 hover:bg-white/15 px-3.5 py-2.5 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white/20 text-white font-semibold text-xs flex items-center justify-center uppercase">
                  {member.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-white">{member.name}</span>
              </div>

              {canManage && (
                <button
                  onClick={() => onRemoveMember?.(member)}
                  aria-label={`Remover ${member.name}`}
                  className="p-1.5 text-white/60 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                  title="Remover do grupo"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </li>
          ))}

          {group.members.length === 0 && (
            <li className="text-center py-5 text-xs text-white/60 bg-white/5 rounded-xl border border-white/10 list-none">
              Nenhum aluno vinculado a este grupo ainda.
            </li>
          )}
        </ul>
      </div>

      {/* BOTÃO ADICIONAR ALUNO */}
      {canManage && (
        <button
          onClick={onAddMember}
          aria-label="Adicionar aluno"
          className="w-full py-2.5 bg-[#757DC3] hover:bg-[#636BAE] text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2"
        >
          <UserPlus size={16} />
          Adicionar aluno
        </button>
      )}
    </section>
  );
}