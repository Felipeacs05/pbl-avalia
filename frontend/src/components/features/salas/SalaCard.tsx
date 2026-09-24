import React from "react";
import { Sala } from "../../../types/sala";
import { IconButton } from "../../ui/IconButton";
import { Link2, Edit } from "lucide-react";

interface SalaCardProps {
  sala: Sala;
  onEntrar: () => void; // Nova função para clicar no card inteiro
  onEditar: () => void;
  onCompartilhar: () => void;
}

export function SalaCard({ sala, onEntrar, onEditar, onCompartilhar }: SalaCardProps) {
  return (
    <div 
      onClick={onEntrar} // Torna o card inteiro clicável
      className="bg-[#4354A0] text-white p-5 rounded-[1.5rem] shadow-md relative cursor-pointer hover:bg-[#3b4b8f] transition-all active:scale-[0.98]"
    >
      <h2 className="text-xl font-bold mb-1 tracking-wide">{sala.nome}</h2>
      
      <span className="inline-block bg-black/20 text-xs font-semibold px-2 py-0.5 rounded text-gray-200 mb-6">
        {sala.codigo}
      </span>

      <hr className="border-t border-white/20 mb-3" />

      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-200">Semestre: {sala.semestre}</span>
        
        <div className="flex gap-2">
          <IconButton
            aria-label={`Compartilhar`}
            icon={<Link2 size={16} />}
            onClick={(e) => {
              e.stopPropagation(); // Impede que o clique no ícone abra a sala
              onCompartilhar();
            }}
          />
          <IconButton
            aria-label={`Editar`}
            icon={<Edit size={16} />}
            onClick={(e) => {
              e.stopPropagation(); // Impede que o clique no ícone abra a sala
              onEditar();
            }}
          />
        </div>
      </div>
    </div>
  );
}