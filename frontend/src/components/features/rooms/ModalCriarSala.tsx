import React from "react";
import { X } from "lucide-react";

interface ModalCriarSalaProps {
  onClose: () => void;
}

export function ModalCriarSala({ onClose }: ModalCriarSalaProps) {
  return (
    // 1. O Filtro Escuro (Overlay)
    <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* 2. A Caixinha do Modal */}
      <div className="bg-[#4354A0] w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative">
        
        {/* Botão de Fechar */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">Criar Matéria</h2>
        <p className="text-xs text-white/70 mb-6">
          O problema nasce com o preset de critérios, que você ajusta na Tabela de Desempenho.
        </p>

        {/* Formulário */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-1">Título</label>
            <input 
              type="text" 
              placeholder="Matéria 1" 
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Descrição</label>
            <textarea 
              placeholder="Descreva a matéria" 
              rows={3}
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3] resize-none"
            />
          </div>
        </div>

        {/* Botão de Submissão */}
        <button 
          onClick={onClose} // Fecha temporariamente ao "Criar" para simular o clique
          className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors"
        >
          Criar
        </button>
      </div>
    </div>
  );
}