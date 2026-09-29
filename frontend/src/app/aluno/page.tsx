"use client";

import React from "react";
import { useSalas } from "../../hooks/useSalas";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { SalaCardAluno } from "../../components/features/salas/SalaCardAluno";

export default function AlunoPage() {
  const { salas, isLoading } = useSalas();

  const handleEntrar = (nome: string) => alert(`Entrando na sala: ${nome}`);
  const handleEntrarEmSala = () => alert("Entrar em sala");

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
            {salas.map((sala, indice) => (
              <SalaCardAluno
                key={sala.id}
                sala={sala}
                indice={indice}
                onEntrar={() => handleEntrar(sala.nome)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomTabBar abaAtiva="aluno" onCriarSala={handleEntrarEmSala} />
      
    </main>
  );
}