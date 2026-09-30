"use client";

import { useState, useEffect } from "react";
import { Sala } from "../types/sala";
import { salasService } from "../services/salasService";

export function useSalas() {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let montado = true;

    async function carregarSalas() {
      try {
        const dados = await salasService.fetchSalas();
        if (montado) setSalas(dados);
      } catch (error) {
        console.error("Erro ao carregar salas", error);
      } finally {
        if (montado) setIsLoading(false);
      }
    }
  
    carregarSalas();
    return () => { montado = false; };
  }, []);

  // Mutação segura: Injeta a nova sala no topo do array imutável
  const adicionarSalaNaLista = (novaSala: Sala) => {
    setSalas((prevSalas) => [novaSala, ...prevSalas]);
  };

  return {
    salas,
    isLoading,
    adicionarSalaNaLista, // Exportamos a nova função
  };
}