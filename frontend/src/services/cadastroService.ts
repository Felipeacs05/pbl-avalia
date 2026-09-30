import { api } from './api';
import { CriarContaParams } from "../types/cadastro";

// Padrão arquitetural mantido: Chave de ambiente
const USE_MOCK = true;

export const cadastroService = {
async criarConta(dados: CriarContaParams): Promise<void> {
    if (USE_MOCK) {
    return new Promise((resolve) => {
        setTimeout(() => {
        console.log("Mock: Simulação de cadastro com sucesso para", dados.email);
        resolve();
        }, 2000);
    });
    }

    // Preparação crítica para envio de Arquivos (File)
    // O backend exige multipart/form-data quando há imagens
    const formData = new FormData();
    formData.append('nome', dados.nome);
    formData.append('email', dados.email);
    formData.append('senha', dados.senha);
    formData.append('imagem', dados.imagem);

    // Chamada de API limpa usando o módulo interceptado
    await api.post('/auth/register', formData, {
    headers: {
        'Content-Type': 'multipart/form-data',
    },
    });
},
};