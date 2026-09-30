import { Sala } from "../types/sala";
import { salasMock } from "../mocks/salas.mock";

export const salasService = {
  async fetchSalas(): Promise<Sala[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...salasMock]);
      }, 500); // Latência simulada
    });
  },

  // Novo método isolado para a US03
  async criarSala(titulo: string, descricao: string): Promise<Sala> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Gera um código alfanumérico de 6 caracteres (ex: "X7B9K2")
        const codigoGerado = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const novaSala: Sala = {
          id: Date.now(), // ID temporário baseado no timestamp
          nome: titulo,
          codigo: codigoGerado,
          semestre: "2026.2", // Valor default do MVP
          tutor: "Marlus Rios", // Mock do usuário logado
        };
        
        console.log("Payload enviado ao Backend:", { titulo, descricao });
        resolve(novaSala);
      }, 1000); // 1s de latência simulada para vermos o botão de loading
    });
  },
};