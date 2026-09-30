import React from "react";
import { Room } from "../../../types/room";

interface StudentRoomCardProps {
  room: Room;
  index: number; // usado só para variar o tom de azul de cada card
  onEnter: () => void;
}

// Tons do Figma, do mais claro ao mais escuro
const COLORS = ["#3F4A9A", "#141B5E", "#020845"];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function StudentRoomCard({ room, index, onEnter }: StudentRoomCardProps) {
  return (
    <div
      onClick={onEnter}
      style={{ backgroundColor: COLORS[index % COLORS.length] }}
      className="text-white p-5 rounded-[1.5rem] border border-white/20 shadow-md cursor-pointer transition-all active:scale-[0.98]"
    >
      <h2 className="text-2xl font-semibold mb-2">{room.name}</h2>

      <span className="inline-block bg-white/30 text-xs font-semibold px-1.5 py-0.5 rounded text-gray-100">
        {room.code}
      </span>

      {/* Linha divisória com a foto do tutor sobre ela */}
      <div className="relative mt-3">
        <hr className="border-t border-white/30" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#CDD3EE] text-[#182860] text-sm font-bold flex items-center justify-center overflow-hidden border-2 border-white/80">
          {room.tutorPhoto ? (
            <img src={room.tutorPhoto} alt={room.tutor} className="w-full h-full object-cover" />
          ) : (
            getInitials(room.tutor ?? "?")
          )}
        </div>
      </div>

      <div className="mt-2 text-[11px] font-semibold leading-tight">
        <p>Semestre: {room.semester}</p>
        <p>Tutor : {room.tutor}</p>
      </div>
    </div>
  );
}