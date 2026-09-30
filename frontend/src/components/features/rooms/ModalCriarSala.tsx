import React, { useState } from "react";
import { X } from "lucide-react";
import { Toast } from "../../ui/Toast";
import { Input } from "../../ui/Input";
import { PrimaryButton } from "../../ui/PrimaryButton";
import { salasService } from "../../../services/salasService";
import { Sala } from "../../../types/sala";

interface ModalCriarSalaProps {
  onClose: () => void;
  onSuccess: (novaSala: Sala) => void; // Contrato de comunicação com o componente pai
}

const MAX_TITULO_LENGTH = 50;

export function ModalCriarSala({ onClose, onSuccess }: ModalCriarSalaProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const handleSubmit = async () => {
    // 1. Sanitização e Validação
    const tituloLimpo = titulo.trim();
    
    if (!tituloLimpo) {
      return setToast({ message: "O título da matéria é obrigatório.", type: "error" });
    }

    if (tituloLimpo.length > MAX_TITULO_LENGTH) {
      return setToast({ message: `O título excede o limite de ${MAX_TITULO_LENGTH} caracteres.`, type: "error" });
    }

    // 2. Execução da Mutação
    setIsSubmitting(true);
    setToast(null);

    try {
      const novaSala = await salasService.criarSala(tituloLimpo, descricao.trim());
      onSuccess(novaSala); // Devolve os dados ao Pai e o Pai fecha o modal
    } catch (error) {
      console.error(error);
      setToast({ message: "Erro ao criar sala. Tente novamente.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // Overlay de z-[60] garante sobreposição em relação ao BottomTabBar (z-50)
    <div className="absolute inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* O Toast do Modal fica numa camada ainda mais alta z-[70] */}
      {toast && (
        <div className="absolute z-[70] w-full flex justify-center">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="bg-[#4354A0] w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative flex flex-col gap-6">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div>
          <h2 className="text-xl font-bold mb-1">Criar Matéria</h2>
          <p className="text-xs text-white/70">
            O problema nasce com o preset de critérios, que você ajusta na Tabela de Desempenho.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Título</label>
            <Input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Engenharia de Software Aplicada"
              disabled={isSubmitting}
            />
            <div className={`text-[10px] text-right mt-1 font-medium ${titulo.length > MAX_TITULO_LENGTH ? 'text-red-400' : 'text-white/60'}`}>
              {titulo.length}/{MAX_TITULO_LENGTH}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a matéria (opcional)"
              rows={3}
              disabled={isSubmitting}
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#757DC3] resize-none disabled:opacity-70 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <PrimaryButton onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Criando sala..." : "Criar Matéria"}
        </PrimaryButton>
      </div>
    </div>
  );
}