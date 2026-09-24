import { Sala } from "../types/sala";
import { salasMock } from "../mocks/salas.mock";

export const salasService = {
  async fetchSalas(): Promise<Sala[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(salasMock);
      }, 500); // 500ms de atraso para testar o efeito visual de loading
    });
  },
};