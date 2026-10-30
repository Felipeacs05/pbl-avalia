import { api } from './api';
import { RegistrationData } from "../types/registration";
import { USE_REAL_API } from "./apiMode";

// Em ambiente de teste ou com NEXT_PUBLIC_USE_MOCKS='false', conecta à API real
const USE_MOCKS = !USE_REAL_API;

export const registrationService = {
  async createAccount(data: RegistrationData, useMock: boolean = USE_MOCKS): Promise<void> {
    if (useMock) {
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
    // A imagem só é anexada se o usuário tiver selecionado uma (foto opcional)
    if (data.image) {
      formData.append('image', data.image);
    }

    await api.post('/auth/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
