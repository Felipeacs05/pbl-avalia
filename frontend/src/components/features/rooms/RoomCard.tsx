import React from "react";
import { Room } from "../../../types/room";
import { IconButton } from "../../ui/IconButton";
import { Link2, Edit, Trash2 } from "lucide-react"; 

interface RoomCardProps {
  room: Room;
  onEnter?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  onCopyLink?: () => void;
  onDelete?: () => void;
}

export function RoomCard({ room, onEnter, onEdit, onShare, onCopyLink, onDelete }: RoomCardProps) {
  const handleCopy = onCopyLink || onShare;
  return (
    // INJEÇÃO TDD: Mudado de <div> para <li> com role="listitem"
    <li
      onClick={onEnter}
      role="listitem"
      className="bg-[#4354A0] text-white p-5 rounded-[1.5rem] shadow-md relative cursor-pointer hover:bg-[#3b4b8f] transition-all active:scale-[0.98] list-none"
    >
      <h2 className="text-xl font-bold mb-1 tracking-wide">{room.name}</h2>
    
      <span className="inline-block bg-black/20 text-xs font-semibold px-2 py-0.5 rounded text-gray-200 mb-6">
        {room.code}
      </span>

      <hr className="border-t border-white/20 mb-3" />

      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-200">
          {room.semester ? `Semestre: ${room.semester}` : ""}
        </span>
      
        <div className="flex gap-2">
          {/* INJEÇÃO TDD: aria-label mudou de 'Compartilhar' para 'Copiar Link' */}
          <IconButton
            aria-label="Copiar Link"
            icon={<Link2 size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              if (handleCopy) handleCopy();
            }}
          />
          <IconButton
            aria-label="Editar"
            icon={<Edit size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit();
            }}
          />
          {/* INJEÇÃO TDD: Botão de excluir adicionado para passar no teste */}
          <IconButton
            aria-label="Excluir"
            icon={<Trash2 size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              if(onDelete) onDelete();
            }}
          />
        </div>
      </div>
    </li>
  );
}