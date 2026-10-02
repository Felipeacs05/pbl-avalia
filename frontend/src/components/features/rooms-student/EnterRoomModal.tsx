"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { PrimaryButton } from "../../ui/PrimaryButton";

interface EnterRoomModalProps {
  name: string;
  email: string;
  initialCode?: string; // vem preenchido quando o aluno chega por link
  onClose: () => void;
  onEnter: (code: string) => void;
}

export function EnterRoomModal({ name, email, initialCode = "", onClose, onEnter }: EnterRoomModalProps) {
  // Começa com o código do link (se houver), mas o aluno ainda pode editar
  const [codigo, setCodigo] = useState(initialCode);

  const handleConfirmar = () => {
    if (!codigo.trim()) return; // não deixa entrar com o campo vazio
    onEnter(codigo.trim().toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#4354A0] w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <p className="text-xs text-white/80 mb-3">Você está entrando como</p>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#CDD3EE] text-[#182860] font-bold flex items-center justify-center">
            {name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight">{name}</h2>
            <span className="inline-block bg-white/20 text-xs px-1.5 py-0.5 rounded mt-1">{email}</span>
          </div>
        </div>

        <hr className="border-t border-white/20 mb-4" />

        <p className="text-[11px] text-center text-white/80 mb-4">
          Insira aqui o código da turma informado pelo professor.
        </p>

        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Código da sala"
          className="w-full bg-white text-gray-900 text-center rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3] mb-3"
        />

        <PrimaryButton onClick={handleConfirmar}>Entrar em Sala PBL</PrimaryButton>
      </div>
    </div>
  );
}