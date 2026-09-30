// src/services/cadastroService.ts
import { RegistrationData } from "../types/registration";

export const registrationService = {
    async createAccount(data: RegistrationData): Promise<void> {
    // Aqui isolamos a simulação do servidor (o "loading" da API)
    return new Promise((resolve) => {
        setTimeout(() => {
        console.log("Dados enviados para o backend:", data);
        resolve(); // Simula o sucesso da API após 2 segundos
        }, 2000);
    });
    },
};