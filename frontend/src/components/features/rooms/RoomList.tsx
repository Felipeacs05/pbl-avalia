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
    const handleCopy = onCopyLink || onShare;
    return (
    // INJEÇÃO TDD: Mudado de <div> para <ul>
    <ul className="space-y-4 m-0 p-0">
        {rooms.map((room) => (
        <RoomCard
            key={room.id}
            room={room}
            onEnter={() => onEnter && onEnter(room)}
            onEdit={() => onEdit && onEdit(room)}
            onCopyLink={() => handleCopy && handleCopy(room)}
            onShare={() => handleCopy && handleCopy(room)}
            onDelete={() => onDelete && onDelete(room)}
        />
        ))}
    </ul>
    );
}