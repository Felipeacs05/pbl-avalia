import { api } from './api';
import { RegistrationData } from "../types/registration";

const USE_MOCK = true;

export const registrationService = {
    async createAccount(data: RegistrationData): Promise<void> {
    if (USE_MOCK) {
        return new Promise((resolve) => {
        setTimeout(() => {
            console.log("Mock: Cadastro realizado com sucesso para:", data.email);
            resolve();
        }, 2000);
        });
    }

    // Preparação para enviar Arquivos (File) reais para a API
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('image', data.image);

    await api.post('/auth/register', formData, {
        headers: {
        'Content-Type': 'multipart/form-data',
        },
    });
    },
};