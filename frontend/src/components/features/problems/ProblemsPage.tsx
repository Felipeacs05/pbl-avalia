import React, { useState, useEffect } from "react";
import type { Problem } from "@/types/discipline";
import { ProblemList } from "./ProblemList";
import { EditProblemModal } from "./EditProblemModal";

export function ProblemsPage({ roomId }: { roomId: string }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    const res = await fetch(`/api/v1/rooms/${roomId}/problems`);
    if (res.ok) {
      const data = await res.json();
      setProblems(data);
    }
  };

  useEffect(() => {
    fetchList();
  }, [roomId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      setError("O título do problema não pode ficar vazio.");
      return;
    }
    const res = await fetch(`/api/v1/rooms/${roomId}/problems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const created = await res.json();
      setProblems((prev) => [...prev, created]);
      setIsCreating(false);
      setNewTitle("");
      setError(null);
    } else {
      setError("Falha ao criar o problema.");
    }
  };

  const handleSaveEdit = async (title: string) => {
    if (!editingProblem) return;
    const res = await fetch(`/api/v1/problems/${editingProblem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.status === 403) {
      setError("Apenas o tutor responsável pela sala pode gerenciar problemas.");
      setEditingProblem(null);
      return;
    }
    if (res.ok) {
      const updated = await res.json();
      setProblems((prev) => prev.map((p) => (p.id === editingProblem.id ? updated : p)));
      setError(null);
      setEditingProblem(null);
    }
  };

  const handleDelete = async (problem: Problem) => {
    const res = await fetch(`/api/v1/problems/${problem.id}`, { method: "DELETE" });
    if (res.ok) {
      setProblems((prev) => prev.filter((p) => p.id !== problem.id));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {error && <div role="alert" className="text-red-500 font-semibold">{error}</div>}

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Problemas</h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-[#4354A0] text-white rounded-xl text-sm font-semibold"
        >
          Criar Novo Problema
        </button>
      </div>

      {isCreating && (
        <div className="p-4 bg-gray-50 border rounded-xl space-y-3">
          <div>
            <label htmlFor="create-problem-title" className="block text-sm font-medium text-gray-700">
              Título
            </label>
            <input
              id="create-problem-title"
              type="text"
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                if (error) setError(null);
              }}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              className="px-4 py-2 bg-[#4354A0] text-white rounded-lg text-sm font-semibold"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ProblemList problems={problems} onEdit={setEditingProblem} onDelete={handleDelete} />

      {editingProblem && (
        <EditProblemModal
          problem={editingProblem}
          onSubmit={handleSaveEdit}
          onClose={() => setEditingProblem(null)}
        />
      )}
    </div>
  );
}
