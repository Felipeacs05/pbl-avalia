"use client";

import { useState, useEffect } from "react";
import { Room } from "../types/room";
import { roomService } from "../services/roomService";

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // Trava de segurança para o celular

    async function loadRooms() {
      try {
        const data = await roomService.fetchRooms();
        if (isMounted) {
          setRooms(data);
        }
      } catch (error) {
        console.error("Erro ao carregar salas", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadRooms();

    return () => {
      isMounted = false; // Limpa a memória quando sai da tela
    };
  }, []);

  return {
    rooms,
    isLoading,
  };
}