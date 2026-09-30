"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import type { Room } from "@/types/room";

interface EditRoomModalProps {
  room: Room;                                // sala sendo editada (o input começa com room.name)
  onSubmit: (name: string) => Promise<void>; // chamado com o novo nome quando válido
  onClose: () => void;
}

const VALIDATION_MESSAGE = "O nome deve ter entre 3 e 100 caracteres.";

export function EditRoomModal({ room, onSubmit, onClose }: EditRoomModalProps) {
  // Começa preenchido com o nome atual da sala
  const [name, setName] = useState(room.name);
  const [error, setError] = useState<string | null>(null);

  function validate(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      setError(VALIDATION_MESSAGE);
      return false;
    }
    setError(null);
    return true;
  }

  async function handleSave() {
    if (!validate(name)) return;
    await onSubmit(name.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#4354A0] w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">Editar Sala</h2>
        <p className="text-xs text-white/70 mb-6">Altere o nome da sala abaixo.</p>

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="edit-room-name" className="block text-sm font-semibold mb-1">
              Nome da sala
            </label>
            <input
              id="edit-room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3]"
            />
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* O teste busca por /salvar/i, então o texto deve ser exatamente "Salvar" */}
        <button
          onClick={handleSave}
          className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
