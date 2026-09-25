"use client";

import React, { useState } from "react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Plus } from "lucide-react";
import { useSalas } from "../../hooks/useSalas";
import { SalaList } from "../../components/features/salas/SalaList";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { ModalCriarSala } from "../../components/features/salas/ModalCriarSala";

export default function Home() {
  const { salas, isLoading } = useSalas();
  const [modalAberto, setModalAberto] = useState(false);

  const handleEntrar = (nome: string) => alert(`Entrando na sala: ${nome}`);
  const handleEditar = (nome: string) => alert(`Editando: ${nome}`);
  const handleCompartilhar = (codigo: string) => alert(`Copiado: ${codigo}`);

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      
      {/* Conteúdo com scroll (pb-40 para o botão/navbar não cobrirem o último card) */}
      <div className="flex-1 px-5 pt-12 pb-40 overflow-y-auto">
        <h1 className="text-2xl font-bold text-center text-[#182860] mb-8 tracking-tight">
          Avalia - Suas Salas
        </h1>

        {isLoading ? (
          <p className="mt-10 text-center text-sm text-gray-500 animate-pulse">Carregando salas...</p>
        ) : (
          <SalaList
            salas={salas}
            onEntrar={(sala) => handleEntrar(sala.nome)}
            onEditar={(sala) => handleEditar(sala.nome)}
            onCompartilhar={(sala) => handleCompartilhar(sala.codigo)}
          />
        )}
      </div>

      {/* Container Fixo Único no Rodapé */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col">
        {/* O botão flutua em cima da navbar */}
        <div className="px-4 pb-3">
          <PrimaryButton icon={<Plus size={20} strokeWidth={3} />} onClick={() => setModalAberto(true)}>
            Criar nova sala
          </PrimaryButton>
        </div>

        {/* NavBar limpa */}
        <BottomTabBar />
      </div>

      {/* Modal de Criação de Sala */}
      {modalAberto && (
        <ModalCriarSala onClose={() => setModalAberto(false)} />
      )}
      
    </main>
  );
}