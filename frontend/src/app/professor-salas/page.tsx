"use client";

import React, { useState } from "react";
import { useSalas } from "../../hooks/useSalas";
import { SalaList } from "../../components/features/rooms/SalaList";
import { BottomTabBar } from "../../components/features/navigation/BottomTabBar";
import { ModalCriarSala } from "../../components/features/rooms/ModalCriarSala";
import { Toast } from "../../components/ui/Toast";
import { Sala } from "../../types/sala";

export default function ProfessorDashboard() {
  // Integramos a nova função adicionarSalaNaLista do nosso hook
  const { salas, isLoading, adicionarSalaNaLista } = useSalas();
  
  const [modalAberto, setModalAberto] = useState(false);
  
  // Estado para gerir Toasts disparados pelo Dashboard (ex: sucesso ao copiar link)
  const [globalToast, setGlobalToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleEntrar = (nome: string) => alert(`Navegando para a sala: ${nome}`);
  const handleEditar = (nome: string) => alert(`Abrindo edição de: ${nome}`);
  
  // Lógica da Tarefa 2: Copiar Link de forma nativa
  const handleCompartilhar = async (codigo: string) => {
    try {
      const linkConvite = `${window.location.origin}/app/join/${codigo}`;
      await navigator.clipboard.writeText(linkConvite);
      setGlobalToast({ message: "Link de convite copiado com sucesso!", type: "success" });
    } catch (err) {
      console.error("Falha ao copiar:", err);
      setGlobalToast({ message: "Erro ao copiar o link.", type: "error" });
    }
  };

  // Callback chamado pelo Modal em caso de sucesso na API
  const handleSalaCriadaComSucesso = (novaSala: Sala) => {
    adicionarSalaNaLista(novaSala); // Atualiza a lista instantaneamente
    setModalAberto(false); // Fecha o modal
    setGlobalToast({ message: "Sala criada com sucesso!", type: "success" }); // Feedback visual
  };

  return (
    <main className="w-full min-h-screen bg-[#F5F5F5] font-sans relative flex flex-col">
      
      {/* Área de Toasts Globais */}
      {globalToast && (
        <Toast 
          message={globalToast.message} 
          type={globalToast.type} 
          onClose={() => setGlobalToast(null)} 
        />
      )}

      {/* Aplicação do no-scrollbar na área rolável */}
      <div className="flex-1 px-5 pt-12 pb-40 overflow-y-auto no-scrollbar">
        <h1 className="text-2xl font-bold text-center text-[#182860] mb-8 tracking-tight">
          Avalia - Suas Salas
        </h1>

        {isLoading ? (
          <p className="mt-10 text-center text-sm text-gray-500 animate-pulse font-medium">Carregando salas...</p>
        ) : (
          <SalaList
            salas={salas}
            onEntrar={(sala) => handleEntrar(sala.nome)}
            onEditar={(sala) => handleEditar(sala.nome)}
            onCompartilhar={(sala) => handleCompartilhar(sala.codigo)} // Passa a função nativa
          />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col">
        <BottomTabBar onCriarSala={() => setModalAberto(true)} />
      </div>

      {modalAberto && (
        <ModalCriarSala 
          onClose={() => setModalAberto(false)} 
          onSuccess={handleSalaCriadaComSucesso} // Passa o contrato de callback
        />
      )}
    </main>
  );
}