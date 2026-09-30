"use client";

import React from "react";
import { useRooms } from "../../hooks/useRooms";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { StudentRoomCard } from "../../components/features/rooms-student/StudentRoomCard";

export default function AlunoPage() {
  const { rooms, isLoading } = useRooms();

  const handleEnter = (name: string) => alert(`Entrando na sala: ${name}`);
  const handleEnterRoom = () => alert("Entrar em sala");

  return (
    <main className="w-full min-h-screen bg-[#F8F9FA] font-sans relative flex flex-col">
      
      <div className="flex-1 px-5 pt-12 pb-36 overflow-y-auto">
        <h1 className="text-2xl font-bold text-center text-[#182860] mb-8 tracking-tight">
          Avalia - Suas Salas
        </h1>

        {isLoading ? (
          <p className="mt-10 text-center text-sm text-gray-500 animate-pulse">Carregando salas...</p>
        ) : (
          <div className="space-y-4">
            {rooms.map((room, index) => (
              <StudentRoomCard
                key={room.id}
                room={room}
                index={index}
                onEnter={() => handleEnter(room.name)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomTabBar activeTab="student" onCreateRoom={handleEnterRoom} />
      
    </main>
  );
}