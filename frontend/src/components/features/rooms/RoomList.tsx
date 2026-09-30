import React from "react";
import type { Room } from "@/types/room";
import { RoomCard } from "./RoomCard";

interface RoomListProps {
  rooms: Room[];
  onEdit: (room: Room) => void;
  onCopyLink: (room: Room) => void;
  onDelete: (room: Room) => void;
}

export function RoomList({ rooms, onEdit, onCopyLink, onDelete }: RoomListProps) {
  return (
    // <ul> + <li> são necessários para os testes acharem role="listitem"
    <ul className="space-y-4 list-none p-0">
      {rooms.map((room) => (
        <li key={room.id}>
          <RoomCard
            room={room}
            onEdit={() => onEdit(room)}
            onCopyLink={() => onCopyLink(room)}
            onDelete={() => onDelete(room)}
          />
        </li>
      ))}
    </ul>
  );
}
