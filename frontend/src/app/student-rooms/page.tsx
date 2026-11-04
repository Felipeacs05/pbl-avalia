"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useStudentsRoom} from  "../../hooks/useStudentsRoom";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { StudentRoomCard } from "../../components/features/rooms-student/StudentRoomCard";
import { useRouter, useSearchParams } from "next/navigation";
import { EnterRoomModal } from "../../components/features/rooms-student/EnterRoomModal";

type HttpError = { response?: { status?: number; data?: { message?: string }; headers?: Record<string, string> } };

function StudentContent() {
  // Consome exclusivamente a estrutura de estudantes
  const { rooms, isLoading, joinRoom } = useStudentsRoom();
  const router = useRouter();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const storedName = localStorage.getItem("userName") || "Estudante";
    const storedEmail = localStorage.getItem("userEmail") || "";
    setUserName(storedName);
    setUserEmail(storedEmail);
  }, []);

  const handleEnter = (roomId: string) => {
    router.push(`/student-rooms/${roomId}`);
  };

  const codeFromUrl = useSearchParams().get("codigo") ?? "";
  const [isModalOpen, setIsModalOpen] = useState(codeFromUrl !== "");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [attemptedCode, setAttemptedCode] = useState("");
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  const handleConfirmCode = async (code: string) => {
    setBlockMessage(null);
    try {
      const joinedRoom = await joinRoom(code);
      setIsModalOpen(false);
      router.push(`/student-rooms/${joinedRoom.id}`);
    } catch (error: unknown) {
      const err = error as HttpError;
      const response = err?.response;
      
      if (response?.status === 429) {
        const minutes = Math.ceil(Number(response.headers?.["retry-after"]) / 60);
        setBlockMessage(
          "Fez demasiadas tentativas com códigos inválidos, pelo que o seu acesso foi bloqueado temporariamente por segurança. " +
            (minutes > 0
              ? `Tente novamente daqui a cerca de ${minutes} min.`
              : "Aguarde alguns minutos e tente novamente.")
        );
        setIsModalOpen(false);
        setIsErrorModalOpen(true);
      } else {
        setAttemptedCode(code);
        setIsModalOpen(false);
        setIsErrorModalOpen(true);
      }
    }
  };

  const safeRooms = Array.isArray(rooms) ? rooms : [];

  return (
    <main className="w-full min-h-screen bg-[#F8F9FA] font-sans relative flex flex-col">
      <div className="flex-1 px-5 pt-12 pb-36 overflow-y-auto">
        <h1 className="text-2xl font-bold text-center text-[#182860] mb-8 tracking-tight">
          Avalia - Suas Salas
        </h1>

        {isLoading ? (
          <p className="mt-10 text-center text-sm text-gray-500 animate-pulse">
            A carregar turmas...
          </p>
        ) : (
          <div className="space-y-4">
            {safeRooms.map((room, index) => (
              <StudentRoomCard
                key={room.id}
                room={room}
                index={index}
                onEnter={() => handleEnter(room.id)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomTabBar activeTab="student" onCreateRoom={() => setIsModalOpen(true)} />

      {isModalOpen && (
        <EnterRoomModal
          name={userName}
          email={userEmail}
          initialCode={codeFromUrl}
          onClose={() => setIsModalOpen(false)}
          onEnter={handleConfirmCode}
        />
      )}

      {isErrorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white rounded-2xl p-6 text-center shadow-xl border border-gray-100 flex flex-col items-center">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {blockMessage ? "Demasiadas tentativas" : "Código incorreto"}
            </h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              {blockMessage ?? (
                <>
                  O código{" "}
                  <span className="font-semibold text-gray-700">
                    “{attemptedCode}”
                  </span>{" "}
                  não corresponde a nenhuma sala ativa. Verifique com o seu professor e tente novamente.
                </>
              )}
            </p>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setIsErrorModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {blockMessage ? "Entendido" : "Fechar"}
              </button>
              {!blockMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setIsErrorModalOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#182860] hover:bg-[#121e48] rounded-lg transition-colors"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function StudentPage() {
  return (
    <Suspense>
      <StudentContent />
    </Suspense>
  );
}
