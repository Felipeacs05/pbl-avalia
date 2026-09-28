"use client";

import React, { useState } from "react";
import { useSalas } from "../hooks/useSalas";
import { SalaList } from "../components/features/salas/SalaList";
import { BottomTabBar } from "../components/features/navigation/BottomTabBar";
import { ModalCriarSala } from "../components/features/salas/ModalCriarSala"; // Seu modal criado anteriormente

export default function Home() {
  const { salas, isLoading } = useSalas();
  
  // Variável que controla se o modal (fundo escuro) aparece ou não
  const [modalAberto, setModalAberto] = useState(false);

  // Note que adicionei o "Entrar" também, já que o card todo é clicável!
  const handleEntrar = (nome: string) => alert(`Entrando na sala: ${nome}`);
  const handleEditar = (nome: string) => alert(`Editando: ${nome}`);
  const handleCompartilhar = (codigo: string) => alert(`Copiado: ${codigo}`);

  return (
    // Tela totalmente limpa e responsiva (w-full min-h-screen)
    <main className="w-full min-h-screen bg-[#F8F9FA] font-sans relative flex flex-col">
      
      {/* Área de rolagem */}
      <div className="flex-1 px-5 pt-12 pb-36 overflow-y-auto">
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

      {/* Ao clicar, muda o estado para true e abre o modal */}
      <BottomTabBar onCriarSala={() => setModalAberto(true)} />

      {/* A mágica do React: O modal do Figma só existe na tela se isso for true */}
      {modalAberto && (
        <ModalCriarSala onClose={() => setModalAberto(false)} />
      )}
      
    </main>
  );
}