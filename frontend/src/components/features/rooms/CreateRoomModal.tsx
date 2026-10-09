import React, { useState } from "react";
import { X } from "lucide-react";

interface CreateRoomModalProps {
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>; 
}

export function CreateRoomModal({ onClose, onSubmit }: CreateRoomModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      setError("O nome da sala deve ter entre 3 e 100 caracteres.");
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      await onSubmit(trimmedName);
      onClose();
    } catch {
      setError("Erro ao criar a sala. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="bg-[#4354A0] w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative">
        
        <button 
          onClick={onClose} 
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">Criar Matéria</h2>
        <p className="text-xs text-white/70 mb-4">
          O problema nasce com o preset de critérios, que você ajusta na Tabela de Desempenho.
        </p>

        {error && (
          <div role="alert" className="mb-4 bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="room-name" className="block text-sm font-semibold">
                Título
                <span className="sr-only">Nome da sala</span>
              </label>
              <span className={`text-xs font-medium ${name.length > 50 ? 'text-red-400' : 'text-white/50'}`}>
                {name.length}/50
              </span>
            </div>
            
            <input 
              id="room-name"
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="Matéria 1" 
              className={`w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition-all ${
                name.length > 50 ? 'ring-2 ring-red-400' : 'focus:ring-[#757DC3]'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Descrição</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Descreva a matéria" 
              rows={3}
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3] resize-none"
            />
          </div>
        </div>

        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full bg-[#757DC3] hover:bg-[#636BAE] text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Criando..." : "Criar"}
        </button>
      </div>
    </div>
  );
}