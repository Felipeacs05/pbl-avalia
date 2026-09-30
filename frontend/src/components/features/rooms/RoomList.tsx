import { Room } from "../../../types/room";
import { RoomCard } from "./RoomCard";

interface RoomListProps {
    rooms: Room[];
    onEnter: (room: Room) => void;
    onEdit: (room: Room) => void;
    onShare: (room: Room) => void;
}

export function RoomList({ rooms, onEnter, onEdit, onShare }: RoomListProps) {
    return (
    <div className="space-y-4">
        {rooms.map((room) => (
        <RoomCard
            key={room.id}
            room={room}
            onEnter={() => onEnter(room)}
            onEdit={() => onEdit(room)}
            onShare={() => onShare(room)}
        />
        ))}
    </div>
    );
}