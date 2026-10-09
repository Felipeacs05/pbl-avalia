import React, { useState } from "react";
import { useGroups } from "@/hooks/useGroups";
import { GroupList } from "./GroupList";
import { CreateGroupModal } from "./CreateGroupModal";
import { EditGroupModal } from "./EditGroupModal";
import { AddMemberModal } from "./AddMemberModal";
import { Toast } from "@/components/ui/Toast";
import { Plus } from "lucide-react";
import type { Group } from "@/types/group";

export function TutorGroupsPanel({ roomId }: { roomId: string }) {
  const {
    groups,
    availableStudents,
    isLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
  } = useGroups(roomId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [addingToGroup, setAddingToGroup] = useState<Group | null>(null);
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  const handleCreateGroup = async (name: string) => {
    try {
      await createGroup(name);
      setToast({ message: "Grupo criado com sucesso!", type: "success" });
    } catch (err: unknown) {
      setToast({ message: getErrorMessage(err, "Erro ao criar grupo."), type: "error" });
      throw err;
    }
  };

  const handleUpdateGroup = async (name: string) => {
    if (!editingGroup) return;
    try {
      await updateGroup(editingGroup.id, name);
      setToast({ message: "Grupo atualizado com sucesso!", type: "success" });
    } catch (err: unknown) {
      setToast({ message: getErrorMessage(err, "Erro ao atualizar grupo."), type: "error" });
      throw err;
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este grupo?")) return;
    try {
      await deleteGroup(groupId);
      setToast({ message: "Grupo excluído com sucesso!", type: "success" });
    } catch {
      setToast({ message: "Erro ao excluir grupo.", type: "error" });
    }
  };

  const handleAddMember = async (studentId: string) => {
    if (!addingToGroup) return;
    try {
      await addMember(addingToGroup.id, studentId);
      setToast({ message: "Aluno adicionado com sucesso!", type: "success" });
    } catch (err: unknown) {
      setToast({ message: getErrorMessage(err, "Erro ao adicionar aluno."), type: "error" });
      throw err;
    }
  };

  const handleRemoveMember = async (groupId: string, studentId: string) => {
    try {
      await removeMember(groupId, studentId);
      setToast({ message: "Aluno removido com sucesso!", type: "success" });
    } catch {
      setToast({ message: "Erro ao remover aluno.", type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 font-medium">
        Carregando grupos...
      </div>
    );
  }

  return (
    <div className="w-full">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* HEADER DE GESTÃO DE GRUPOS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Gestão de Grupos</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Organize os estudantes da turma em equipes para as avaliações semestrais.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#4354A0] hover:bg-[#34427E] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus size={18} strokeWidth={2.5} />
          Criar grupo
        </button>
      </div>

      {/* LISTAGEM DE CARDS */}
      <GroupList
        groups={groups}
        canManage={true}
        onEdit={setEditingGroup}
        onDelete={(group) => handleDeleteGroup(group.id)}
        onAddMember={setAddingToGroup}
        onRemoveMember={(group, student) => handleRemoveMember(group.id, student.id)}
      />

      {isCreateOpen && (
        <CreateGroupModal
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateGroup}
        />
      )}

      {editingGroup && (
        <EditGroupModal
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSubmit={handleUpdateGroup}
        />
      )}

      {addingToGroup && (
        <AddMemberModal
          students={availableStudents}
          onClose={() => setAddingToGroup(null)}
          onSubmit={handleAddMember}
        />
      )}
    </div>
  );
}