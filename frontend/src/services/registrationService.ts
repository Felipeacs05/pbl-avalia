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

    const formData = new FormData();
    
    // 1. Dados do utilizador em JSON no part 'data'
    const jsonPayload = JSON.stringify({
      name: data.name,
      email: data.email,
      password: data.password,
    });
    formData.append('data', new Blob([jsonPayload], { type: 'application/json' }));

    // 2. Envia a foto apenas se ela existir (File válido)
    if (data.image && data.image instanceof File) {
      formData.append('photo', data.image);
    }

    await api.post('/auth/register', formData);
  },
};