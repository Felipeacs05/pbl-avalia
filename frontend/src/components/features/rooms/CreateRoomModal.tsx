"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface CreateRoomModalProps {
  // onSubmit é async: a página chama o service e este componente espera antes de fechar
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

// Mensagem de validação em português, com a faixa que os testes buscam: /entre 3 e 100 caracteres/i
const VALIDATION_MESSAGE = "O nome deve ter entre 3 e 100 caracteres.";

export function CreateRoomModal({ onSubmit, onClose }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function validate(value: string): boolean {
    // Limpa espaços das pontas antes de medir o tamanho
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      setError(VALIDATION_MESSAGE);
      return false;
    }
    setError(null);
    return true;
  }

  async function handleCreate() {
    if (!validate(name)) return; // bloqueia se inválido, sem chamar onSubmit
    await onSubmit(name.trim());
    onClose(); // só fecha depois que a Promise resolver
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#4354A0] w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">Criar Sala</h2>
        <p className="text-xs text-white/70 mb-6">
          O código de acesso será gerado automaticamente pelo sistema.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            {/* htmlFor liga o label ao input; os testes encontram o campo via getByLabelText(/nome da sala/i) */}
            <label htmlFor="room-name" className="block text-sm font-semibold mb-1">
              Nome da sala
            </label>
            <input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Engenharia de Software"
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3]"
            />
            {/* role="alert" faz o leitor de tela e os testes encontrarem a mensagem de erro */}
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors"
        >
          Criar
        </button>
      </div>
    </div>
  );
}
