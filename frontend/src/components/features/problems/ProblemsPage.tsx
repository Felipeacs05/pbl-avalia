"use client";

import React, { useState } from "react";
import { useProblems } from "@/hooks/useProblems";
import type { Problem } from "@/types/problem";
import { ProblemList } from "./ProblemList";
import { CreateProblemModal } from "./CreateProblemModal";
import { EditProblemModal } from "./EditProblemModal";

interface ProblemsPageProps {
  roomId: string;
}

export function ProblemsPage({ roomId }: ProblemsPageProps) {
  const { problems, isLoading, error: hookError, createProblem, updateProblem, deleteProblem } =
    useProblems(roomId);

  const [isCreating, setIsCreating] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const activeError = globalError || hookError;

  const handleCreateSubmit = async (title: string) => {
    setGlobalError(null);
    try {
      await createProblem(title);
    } catch {
      setGlobalError("Falha ao criar o problema.");
      throw new Error("Falha ao criar o problema.");
    }
  };

  const handleEditSubmit = async (title: string) => {
    if (!editingProblem) return;
    setGlobalError(null);
    try {
      await updateProblem(editingProblem.id, title);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 403) {
        setGlobalError("Apenas o tutor da sala pode editar problemas.");
      } else {
        setGlobalError("Falha ao editar o problema.");
      }
      throw err;
    }
  };

  const handleDelete = async (problem: Problem) => {
    setGlobalError(null);
    try {
      await deleteProblem(problem.id);
    } catch {
      setGlobalError("Falha ao excluir o problema.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#182860]">Problemas PBL</h1>
        <button
          onClick={() => {
            setIsCreating(true);
            setGlobalError(null);
          }}
          className="bg-[#2D3A74] hover:bg-[#232e5c] text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Criar novo problema
        </button>
      </div>

      {activeError && (
        <div role="alert" className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg text-sm">
          {activeError}
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-500">Carregando problemas...</p>
      ) : (
        <ProblemList
          problems={problems}
          onEdit={(problem) => setEditingProblem(problem)}
          onDelete={handleDelete}
        />
      )}

      {isCreating && (
        <CreateProblemModal
          onSubmit={handleCreateSubmit}
          onClose={() => setIsCreating(false)}
        />
      )}

      {editingProblem && (
        <EditProblemModal
          problem={editingProblem}
          onSubmit={handleEditSubmit}
          onClose={() => setEditingProblem(null)}
        />
      )}
    </div>
  );
}
