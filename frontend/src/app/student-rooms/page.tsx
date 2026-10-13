"use client";

import React, { useState, Suspense } from "react";
import { useRooms } from "../../hooks/useRooms";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { StudentRoomCard } from "../../components/features/rooms-student/StudentRoomCard";
import { useSearchParams } from "next/navigation";
import { EnterRoomModal } from "../../components/features/rooms-student/EnterRoomModal";
import { attemptEnterRoom } from "../../mocks/roomCode.mock";

type HttpError = { response?: { status?: number; headers?: Record<string, string> } };

function StudentContent() {
  const { rooms, isLoading } = useRooms();

  const handleEnter = (name: string) => alert(`Entrando na sala: ${name}`);

  const codeFromUrl = useSearchParams().get("codigo") ?? "";
  const [isModalOpen, setIsModalOpen] = useState(codeFromUrl !== "");
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [attemptedCode, setAttemptedCode] = useState("");
  const [blockMessage, setBlockMessage] = useState<string | null>(null);

  const handleConfirmCode = async (code: string) => {
    setBlockMessage(null); // nova tentativa: limpa o aviso de bloqueio anterior
    try {
      if (await attemptEnterRoom(code)) {
        setIsModalOpen(false);
        alert(`Entrando na sala com o código: ${code.toUpperCase()}`);
      } else {
        setAttemptedCode(code);
        setIsModalOpen(false);
        setIsErrorModalOpen(true);
      }
    } catch (error) {
      const response = (error as HttpError).response;
      if (response?.status === 429) {
        const minutes = Math.ceil(Number(response.headers?.["retry-after"]) / 60);
        setBlockMessage(
          "Você fez muitas tentativas com códigos inválidos, então seu acesso foi bloqueado temporariamente por segurança. " +
            (minutes > 0
              ? `Tente novamente em cerca de ${minutes} min.`
              : "Aguarde alguns minutos e tente novamente.")
        );
        setIsModalOpen(false);
        setIsErrorModalOpen(true);
      } else {
        console.error("Erro ao entrar na sala:", error);
      }
    }
  };

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

      <BottomTabBar activeTab="student" onCreateRoom={() => setIsModalOpen(true)} />

      {isModalOpen && (
        <EnterRoomModal
          // trocar por nome/e-mail do usuário logado. Por enquanto usa o mesmo usuário do mock de login.
          name="Marlus Rios"
          email="marlus@uefs.br"
          initialCode={codeFromUrl}
          onClose={() => setIsModalOpen(false)}
          onEnter={handleConfirmCode}
        />
      )}

      {isErrorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white rounded-2xl p-6 text-center shadow-xl border border-gray-100 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>

            {/* Se blockMessage existe, o pop-up mostra o aviso de bloqueio (429); senão, o "Código errado" de sempre */}
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {blockMessage ? "Muitas tentativas" : "Código errado"}
            </h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              {blockMessage ?? (
                <>
                  O código <span className="font-semibold text-gray-700">“{attemptedCode}”</span> não corresponde a nenhuma sala ativa. Verifique com seu professor e tente novamente.
                </>
              )}
            </p>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setIsErrorModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {/* aviso amigável para o usuario */}
                {blockMessage ? "Entendi" : "Fechar"}
              </button>
              {/* Bloqueado: esconde "Tentar de novo", porque tentar agora só gera outro 429 */}
              {!blockMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setIsErrorModalOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#182860] hover:bg-[#121e48] rounded-lg transition-colors"
                >
                  Tentar de novo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Next exige Suspense em páginas que usam useSearchParams
export default function StudentPage() {
  return <Suspense><StudentContent /></Suspense>;
}