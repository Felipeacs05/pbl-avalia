import React from "react";
import type { Room } from "@/types/room";
import { Link2, Edit, Trash2 } from "lucide-react";

interface RoomCardProps {
  room: Room;
  onEdit: () => void;
  onCopyLink: () => void;
  onDelete: () => void;
}

export function RoomCard({ room, onEdit, onCopyLink, onDelete }: RoomCardProps) {
  return (
    // O card usa role="listitem" implícito via <li> no RoomList
    <div className="bg-[#4354A0] text-white p-5 rounded-[1.5rem] shadow-md relative">
      <h2 className="text-xl font-bold mb-1 tracking-wide">{room.name}</h2>

      <span className="inline-block bg-black/20 text-xs font-semibold px-2 py-0.5 rounded text-gray-200 mb-6">
        {room.code}
      </span>

      <hr className="border-t border-white/20 mb-3" />

      <div className="flex justify-end items-center gap-2">
        {/* aria-label em português para os testes acharem por /copiar link/i, /editar/i, /excluir/i */}
        <button
          aria-label="Copiar link"
          onClick={onCopyLink}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Link2 size={16} />
        </button>
        <button
          aria-label="Editar"
          onClick={onEdit}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Edit size={16} />
        </button>
        <button
          aria-label="Excluir"
          onClick={onDelete}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
