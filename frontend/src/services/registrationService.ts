import { api } from './api';
import { RegistrationData } from "../types/registration";
import { USE_REAL_API } from "./apiMode";

export const registrationService = {
    async createAccount(data: RegistrationData): Promise<void> {
    if (!USE_REAL_API) {
        return new Promise((resolve) => {
        setTimeout(() => {
            console.log("Mock: Cadastro realizado com sucesso para:", data.email);
            resolve();
        }, 2000);
        });
    }

    // Preparação para enviar Multipart com data (JSON) e photo (File) reais para a API
    const formData = new FormData();
    const jsonPayload = JSON.stringify({
      name: data.name,
      email: data.email,
      password: data.password,
    });
    formData.append('data', new Blob([jsonPayload], { type: 'application/json' }));
    // O backend espera o arquivo na parte 'photo'
    if (data.image) {
      formData.append('photo', data.image);
    }

    await api.post('/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    },
};