// src/services/cadastroService.ts
import { CriarContaParams } from "../types/cadastro";

export const cadastroService = {
    async criarConta(dados: CriarContaParams): Promise<void> {
    // Aqui isolamos a simulação do servidor (o "loading" da API)
    return new Promise((resolve) => {
        setTimeout(() => {
        console.log("Dados enviados para o backend:", dados);
        resolve(); // Simula o sucesso da API após 2 segundos
        }, 2000);
    });
    },
};