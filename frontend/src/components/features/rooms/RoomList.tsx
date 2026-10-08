"use client";

import { useRouter } from "next/navigation";
import { Room } from "../../../types/room";
import { RoomCard } from "./RoomCard";

interface RoomListProps {
    rooms: Room[];
    onEnter?: (room: Room) => void;
    onEdit?: (room: Room) => void;
    onShare?: (room: Room) => void;
    onCopyLink?: (room: Room) => void;
    onDelete?: (room: Room) => void; // Propagando o onDelete
}

export function RoomList({ rooms, onEnter, onEdit, onShare, onCopyLink, onDelete }: RoomListProps) {
    const router = useRouter();
    const handleCopy = onCopyLink || onShare;

    const handleEnter = (room: Room) => {
        if (onEnter) {
            onEnter(room);
        } else {
            router.push(`/professor-salas/${room.id}/disciplinas`);
        }
    };

    return (
    // INJEÇÃO TDD: Mudado de <div> para <ul>
    <ul className="space-y-4 m-0 p-0">
        {rooms.map((room) => (
        <RoomCard
            key={room.id}
            room={room}
            onEnter={() => handleEnter(room)}
            onEdit={() => onEdit && onEdit(room)}
            onCopyLink={() => handleCopy && handleCopy(room)}
            onShare={() => handleCopy && handleCopy(room)}
            onDelete={() => onDelete && onDelete(room)}
        />
        ))}
    </ul>
    );
}